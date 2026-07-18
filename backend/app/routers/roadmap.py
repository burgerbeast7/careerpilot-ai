from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import json

from app.core.database import get_db
from app.routers.auth import get_current_user
from app.models.user import User
from app.models.roadmap import Roadmap
from app.models.skill_gap import SkillGap
from app.schemas.roadmap import RoadmapRequest, TaskUpdate, RoadmapResponse

router = APIRouter(prefix="/roadmap", tags=["roadmap"])

@router.post("/generate")
async def generate_roadmap(
    request_in: RoadmapRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Triggers the Roadmap Generator agent stream. Analyzes the latest skill gaps
    and generates a week-by-week study checklist, committing it to PostgreSQL.
    """
    # 1. Grab latest skill gap details
    latest_gap = db.query(SkillGap).filter(SkillGap.user_id == current_user.id).order_by(SkillGap.analyzed_at.desc()).first()
    
    missing_list = []
    if latest_gap:
        try:
            m_skills = json.loads(latest_gap.missing_skills) if isinstance(latest_gap.missing_skills, str) else latest_gap.missing_skills
            if m_skills:
                missing_list = list(m_skills.keys())
        except Exception:
            pass
            
    if not missing_list:
        missing_list = ["Docker & Kubernetes", "PostgreSQL Databases", "FastAPI Core REST APIs", "Pytest & CI/CD Pipelines"]

    # 2. Return SSE Streaming Response
    async def sse_generator():
        async for message in CareerAgents.run_orchestrator("roadmap_generation", {
            "duration_weeks": request_in.duration_weeks,
            "missing_skills": missing_list,
            "target_role": current_user.target_role or "Software Engineer"
        }):
            if "complete" in message:
                clean_msg = message.replace("data: ", "").strip()
                try:
                    payload = json.loads(clean_msg)
                    if payload.get("event") == "complete":
                        result = payload.get("result", {})
                        
                        # Create and save Roadmap DB entry
                        db_roadmap = Roadmap(
                            user_id=current_user.id,
                            duration_weeks=request_in.duration_weeks,
                            weekly_goals=json.dumps(result.get("weekly_goals", [])),
                            tasks_data=json.dumps(result.get("tasks_data", [])),
                            progress_percentage=0.0
                        )
                        db.add(db_roadmap)
                        db.commit()
                except Exception as e:
                    print(f"Error saving roadmap: {e}")
            yield message
            
    from app.services.agents import CareerAgents
    return StreamingResponse(sse_generator(), media_type="text/event-stream")

@router.get("/latest")
def get_latest_roadmap(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Fetches the latest learning roadmap for the authenticated user.
    """
    roadmap = db.query(Roadmap).filter(Roadmap.user_id == current_user.id).order_by(Roadmap.created_at.desc()).first()
    if not roadmap:
        raise HTTPException(status_code=404, detail="No active roadmap found.")
        
    w_goals = json.loads(roadmap.weekly_goals) if isinstance(roadmap.weekly_goals, str) else roadmap.weekly_goals
    t_data = json.loads(roadmap.tasks_data) if isinstance(roadmap.tasks_data, str) else roadmap.tasks_data

    return {
        "id": roadmap.id,
        "user_id": roadmap.user_id,
        "duration_weeks": roadmap.duration_weeks,
        "weekly_goals": w_goals,
        "tasks_data": t_data,
        "progress_percentage": roadmap.progress_percentage,
        "created_at": roadmap.created_at
    }

@router.post("/task-toggle")
def toggle_roadmap_task(
    payload: TaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Toggles completion of a specific task inside weekly syllabus and updates progress.
    """
    roadmap = db.query(Roadmap).filter(Roadmap.user_id == current_user.id).order_by(Roadmap.created_at.desc()).first()
    if not roadmap:
        raise HTTPException(status_code=404, detail="No active roadmap found to toggle task.")
        
    t_data = json.loads(roadmap.tasks_data) if isinstance(roadmap.tasks_data, str) else roadmap.tasks_data
    
    # Toggle target task
    try:
        # Find week matching index
        target_week = None
        for w in t_data:
            if w.get("week") == payload.week_index:
                target_week = w
                break
                
        if target_week:
            target_week["tasks"][payload.task_index]["completed"] = payload.completed
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid task indices: {e}")

    # Re-calculate overall progress percentage
    total_tasks = 0
    completed_tasks = 0
    for w in t_data:
        for t in w.get("tasks", []):
            total_tasks += 1
            if t.get("completed", False):
                completed_tasks += 1
                
    progress = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0
    
    roadmap.tasks_data = json.dumps(t_data)
    roadmap.progress_percentage = round(progress, 1)
    
    db.add(roadmap)
    db.commit()
    db.refresh(roadmap)
    
    return {
        "progress_percentage": roadmap.progress_percentage,
        "tasks_data": t_data
    }
