from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from datetime import datetime, timezone
from bson import ObjectId
from app.core.database import get_mongo_db
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
    db = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Triggers the Skill Gap detection agent stream. Compiles missing competencies and saves
    the final report in PostgreSQL on stream completion.
    """
    role = request_in.target_role or current_user.get("target_role") or "Software Engineer"
    company = request_in.target_company or current_user.get("target_company") or "IBM"
    
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
                        
                        mongo_db = get_mongo_db()
                        db_gap = {
                            "user_id": current_user["id"],
                            "target_role": role,
                            "target_company": company,
                            "current_skills": result.get("current_skills"),
                            "missing_skills": result.get("missing_skills"),
                            "recommendations": result.get("recommendations"),
                            "analyzed_at": datetime.now(timezone.utc)
                        }
                        mongo_db.skill_gaps.insert_one(db_gap)
                except Exception as e:
                    print(f"Error saving skill gap record: {e}")
            yield message
            
    return StreamingResponse(sse_generator(), media_type="text/event-stream")

@router.get("/latest")
def get_latest_gap(
    db = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Fetches the latest skill gap report for the authenticated user.
    """
    gap = db.skill_gaps.find_one({"user_id": current_user["id"]}, sort=[("analyzed_at", -1)])
    if not gap:
        raise HTTPException(status_code=404, detail="No skill gap analysis reports found.")
    
    gap["id"] = str(gap["_id"])
    return gap
