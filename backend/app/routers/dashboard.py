from fastapi import APIRouter, Depends
from datetime import datetime, timezone
from bson import ObjectId
from app.core.database import get_mongo_db
import json

from app.core.database import get_db
from app.routers.auth import get_current_user
from app.models.user import User
from app.models.resume import Resume
from app.models.skill_gap import SkillGap
from app.models.roadmap import Roadmap
from app.models.interview import Interview

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

@router.get("/summary")
def get_dashboard_summary(
    db = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Compiles circular scoring gauges, upcoming checklist targets, recent activities,
    and calculates the Job Readiness Index.
    """
    # 1. Fetch latest data objects
    latest_resume = db.resumes.find_one({"user_id": current_user["id"]}, sort=[("analyzed_at", -1)])
    latest_gap = db.skill_gaps.find_one({"user_id": current_user["id"]}, sort=[("analyzed_at", -1)])
    latest_roadmap = db.roadmaps.find_one({"user_id": current_user["id"]}, sort=[("created_at", -1)])
    latest_interview = db.interviews.find_one({"user_id": current_user["id"]}, sort=[("created_at", -1)])

    # 2. Extract scores
    ats_score = latest_resume.get("ats_score", 0) if latest_resume else 0
    resume_score = latest_resume.get("ats_score", 0) if latest_resume else 0  # fallback
    interview_score = int(latest_interview.get("overall_score", 0) * 10) if latest_interview else 0
    learning_progress = int(latest_roadmap.get("progress_percentage", 0)) if latest_roadmap else 0

    # 3. Calculate intelligent composite Job Readiness Score
    # Resume: 35%, Learning: 30%, Interview: 35%
    readiness_score = 0
    active_weights = 0
    
    if latest_resume:
        readiness_score += (ats_score * 0.35)
        active_weights += 0.35
    if latest_roadmap:
        readiness_score += (learning_progress * 0.30)
        active_weights += 0.30
    if latest_interview:
        readiness_score += (interview_score * 0.35)
        active_weights += 0.35
        
    final_readiness = int(readiness_score / active_weights) if active_weights > 0 else 0

    # 4. Extract upcoming uncompleted tasks from active roadmap
    upcoming = []
    if latest_roadmap:
        try:
            tasks_data = json.loads(latest_roadmap.get("tasks_data")) if isinstance(latest_roadmap.get("tasks_data"), str) else latest_roadmap.get("tasks_data")
            for week in tasks_data:
                for task in week.get("tasks", []):
                    if not task.get("completed", False):
                        upcoming.append({
                            "week": week.get("week"),
                            "title": week.get("title"),
                            "task": task.get("task")
                        })
                        if len(upcoming) >= 3:
                            break
                if len(upcoming) >= 3:
                    break
        except Exception:
            pass

    # 5. Formulate dynamic timeline / recent activity logs
    activities = []
    if latest_resume:
        activities.append({
            "title": "Uploaded Portfolio Resume",
            "desc": f"Analyzed ATS compatibility: {ats_score}%",
            "time": latest_resume.get("analyzed_at", datetime.now(timezone.utc)).strftime("%Y-%m-%d")
        })
    if latest_gap:
        activities.append({
            "title": "Audited Industry Skill Gaps",
            "desc": f"Mapped targets for {latest_gap.get("target_role")}",
            "time": latest_gap.get("analyzed_at", datetime.now(timezone.utc)).strftime("%Y-%m-%d")
        })
    if latest_roadmap:
        activities.append({
            "title": "Initialized Study Roadmap",
            "desc": f"Duration: {latest_roadmap.get("duration_weeks")} weeks",
            "time": latest_roadmap.get("created_at", datetime.now(timezone.utc)).strftime("%Y-%m-%d")
        })
    if latest_interview:
        activities.append({
            "title": "Conducted Mock Interview Session",
            "desc": f"Score achieved: {latest_interview.get("overall_score", 0)}/10",
            "time": latest_interview.get("created_at", datetime.now(timezone.utc)).strftime("%Y-%m-%d")
        })

    # Default activities if empty
    if not activities:
        activities.append({
            "title": "Account Initialized",
            "desc": "CareerPilot dashboard is ready for portfolio upload.",
            "time": "Today"
        })

    # Extract missing skills count
    missing_count = 0
    if latest_gap:
        try:
            m_skills = json.loads(latest_gap.get("missing_skills", [])) if isinstance(latest_gap.get("missing_skills", []), str) else latest_gap.get("missing_skills", [])
            missing_count = len(m_skills) if m_skills else 0
        except Exception:
            pass

    return {
        "readiness_score": final_readiness,
        "ats_score": ats_score,
        "resume_score": resume_score,
        "interview_score": interview_score,
        "learning_progress": learning_progress,
        "missing_skills_count": missing_count,
        "upcoming_tasks": upcoming,
        "recent_activity": activities
    }
