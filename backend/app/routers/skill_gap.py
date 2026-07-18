from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import json

from app.core.database import get_db
from app.routers.auth import get_current_user
from app.models.user import User
from app.models.skill_gap import SkillGap
from app.schemas.skill_gap import SkillGapRequest, SkillGapResponse
from app.services.agents import CareerAgents

router = APIRouter(prefix="/skill-gap", tags=["skill-gap"])

@router.post("/analyze")
async def analyze_skill_gap(
    request_in: SkillGapRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Triggers the Skill Gap detection agent stream. Compiles missing competencies and saves
    the final report in PostgreSQL on stream completion.
    """
    role = request_in.target_role or current_user.target_role or "Software Engineer"
    company = request_in.target_company or current_user.target_company or "IBM"
    
    # Custom SSE generator to update the DB on pipeline completion
    async def sse_generator():
        async for message in CareerAgents.run_orchestrator("skill_gap_analysis", {
            "target_role": role,
            "target_company": company,
            "current_skills": request_in.current_skills
        }):
            if "complete" in message:
                clean_msg = message.replace("data: ", "").strip()
                try:
                    payload = json.loads(clean_msg)
                    if payload.get("event") == "complete":
                        result = payload.get("result", {})
                        
                        # Create and save Skill Gap database record
                        db_gap = SkillGap(
                            user_id=current_user.id,
                            target_role=role,
                            target_company=company,
                            current_skills=json.dumps(result.get("current_skills")),
                            missing_skills=json.dumps(result.get("missing_skills")),
                            recommendations=json.dumps(result.get("recommendations"))
                        )
                        db.add(db_gap)
                        db.commit()
                except Exception as e:
                    print(f"Error saving skill gap record: {e}")
            yield message
            
    return StreamingResponse(sse_generator(), media_type="text/event-stream")

@router.get("/latest")
def get_latest_gap(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Fetches the latest skill gap report for the authenticated user.
    """
    gap = db.query(SkillGap).filter(SkillGap.user_id == current_user.id).order_by(SkillGap.analyzed_at.desc()).first()
    if not gap:
        raise HTTPException(status_code=404, detail="No skill gap analysis reports found.")
    
    # Deserialize JSON strings for Pydantic Schema compatibility if SQLite stores as string
    curr_skills = json.loads(gap.current_skills) if isinstance(gap.current_skills, str) else gap.current_skills
    miss_skills = json.loads(gap.missing_skills) if isinstance(gap.missing_skills, str) else gap.missing_skills
    recs = json.loads(gap.recommendations) if isinstance(gap.recommendations, str) else gap.recommendations

    return {
        "id": gap.id,
        "user_id": gap.user_id,
        "target_role": gap.target_role,
        "target_company": gap.target_company,
        "current_skills": curr_skills,
        "missing_skills": miss_skills,
        "recommendations": recs,
        "analyzed_at": gap.analyzed_at
    }
