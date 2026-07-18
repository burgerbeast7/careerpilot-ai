from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
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
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Compiles circular scoring gauges, upcoming checklist targets, recent activities,
    and calculates the Job Readiness Index.
    """
    # 1. Fetch latest data objects
    latest_resume = db.query(Resume).filter(Resume.user_id == current_user.id).order_by(Resume.analyzed_at.desc()).first()
    latest_gap = db.query(SkillGap).filter(SkillGap.user_id == current_user.id).order_by(SkillGap.analyzed_at.desc()).first()
    latest_roadmap = db.query(Roadmap).filter(Roadmap.user_id == current_user.id).order_by(Roadmap.created_at.desc()).first()
    latest_interview = db.query(Interview).filter(Interview.user_id == current_user.id).order_by(Interview.created_at.desc()).first()

    # 2. Extract scores
    ats_score = latest_resume.ats_score if latest_resume else 0
    resume_score = latest_resume.ats_score if latest_resume else 0  # fallback
    interview_score = int(latest_interview.overall_score * 10) if latest_interview else 0
    learning_progress = int(latest_roadmap.progress_percentage) if latest_roadmap else 0

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
            tasks_data = json.loads(latest_roadmap.tasks_data) if isinstance(latest_roadmap.tasks_data, str) else latest_roadmap.tasks_data
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
            "time": latest_resume.analyzed_at.strftime("%Y-%m-%d")
        })
    if latest_gap:
        activities.append({
            "title": "Audited Industry Skill Gaps",
            "desc": f"Mapped targets for {latest_gap.target_role}",
            "time": latest_gap.analyzed_at.strftime("%Y-%m-%d")
        })
    if latest_roadmap:
        activities.append({
            "title": "Initialized Study Roadmap",
            "desc": f"Duration: {latest_roadmap.duration_weeks} weeks",
            "time": latest_roadmap.created_at.strftime("%Y-%m-%d")
        })
    if latest_interview:
        activities.append({
            "title": "Conducted Mock Interview Session",
            "desc": f"Score achieved: {latest_interview.overall_score}/10",
            "time": latest_interview.created_at.strftime("%Y-%m-%d")
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
            m_skills = json.loads(latest_gap.missing_skills) if isinstance(latest_gap.missing_skills, str) else latest_gap.missing_skills
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
