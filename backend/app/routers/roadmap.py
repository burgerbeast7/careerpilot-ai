from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from datetime import datetime, timezone
from bson import ObjectId
from app.core.database import get_mongo_db
import json

from app.core.database import get_db, get_mongo_db
from app.routers.auth import get_current_user
from app.models.user import User
from app.models.roadmap import Roadmap
from app.models.skill_gap import SkillGap
from app.models.recommendation import Recommendation
from app.schemas.roadmap import RoadmapRequest, TaskUpdate, RoadmapResponse

router = APIRouter(prefix="/roadmap", tags=["roadmap"])

@router.post("/generate")
async def generate_roadmap(
    request_in: RoadmapRequest,
    db = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Triggers the Roadmap Generator agent stream. Analyzes the latest skill gaps
    and generates a week-by-week study checklist, committing it to PostgreSQL.
    """
    # 1. Grab job details or latest skill gap details
    missing_list = []
    target_role = current_user.get("target_role") or "Software Engineer"
    
    if request_in.recommendation_id:
        try: rec_id = ObjectId(request_in.recommendation_id)
        except: rec_id = request_in.recommendation_id
        rec = db.recommendations.find_one({
            "_id": rec_id, 
            "user_id": current_user["id"]
        })
        if rec:
            target_role = rec.get("job_title") or "Software Engineer"
            try:
                req_skills = rec.get("required_skills")
                if req_skills:
                    if isinstance(req_skills, str):
                        req_skills = json.loads(req_skills)
                    missing_list = list(req_skills)
            except Exception:
                pass
                
    if not missing_list:
        latest_gap = db.skill_gaps.find_one({"user_id": current_user["id"]}, sort=[("analyzed_at", -1)])
        if latest_gap:
            try:
                m_skills = latest_gap.get("missing_skills")
                if m_skills:
                    if isinstance(m_skills, str):
                        m_skills = json.loads(m_skills)
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
            "target_role": target_role
        }):
            if "complete" in message:
                clean_msg = message.replace("data: ", "").strip()
                try:
                    payload = json.loads(clean_msg)
                    if payload.get("event") == "complete":
                        result = payload.get("result", {})
                        
                        mongo_db = get_mongo_db()
                        db_roadmap = {
                            "user_id": current_user["id"],
                            "duration_weeks": request_in.duration_weeks,
                            "weekly_goals": result.get("weekly_goals", []),
                            "tasks_data": result.get("tasks_data", []),
                            "progress_percentage": 0.0,
                            "created_at": datetime.now(timezone.utc)
                        }
                        mongo_db.roadmaps.insert_one(db_roadmap)
                except Exception as e:
                    print(f"Error saving roadmap: {e}")
            yield message
            
    from app.services.agents import CareerAgents
    return StreamingResponse(sse_generator(), media_type="text/event-stream")

@router.get("/latest")
def get_latest_roadmap(
    db = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Fetches the latest learning roadmap for the authenticated user.
    """
    roadmap = db.roadmaps.find_one({"user_id": current_user["id"]}, sort=[("created_at", -1)])
    if not roadmap:
        raise HTTPException(status_code=404, detail="No active roadmap found.")
        
    roadmap["id"] = str(roadmap["_id"])
    return roadmap

@router.post("/task-toggle")
def toggle_roadmap_task(
    payload: TaskUpdate,
    db = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Toggles completion of a specific task inside weekly syllabus and updates progress.
    """
    roadmap = db.roadmaps.find_one({"user_id": current_user["id"]}, sort=[("created_at", -1)])
    if not roadmap:
        raise HTTPException(status_code=404, detail="No active roadmap found to toggle task.")
        
    t_data = roadmap.get("tasks_data", [])
    
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
    
    progress = round(progress, 1)
    db.roadmaps.update_one({"_id": roadmap["_id"]}, {"$set": {"tasks_data": t_data, "progress_percentage": progress}})
    
    return {
        "progress_percentage": progress,
        "tasks_data": t_data
    }
