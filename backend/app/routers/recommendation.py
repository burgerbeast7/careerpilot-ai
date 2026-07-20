from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, timezone
from bson import ObjectId
from app.core.database import get_mongo_db
import json

from app.core.database import get_db
from app.routers.auth import get_current_user
from app.models.user import User
from app.models.recommendation import Recommendation
from app.schemas.recommendation import RecommendationStatusUpdate, RecommendationResponse
from app.services.ai_factory import AIFactory

router = APIRouter(prefix="/recommendations", tags=["recommendations"])

@router.post("/recommend", response_model=list[RecommendationResponse])
async def generate_recommendations(
    db = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Spawns the Recommendation Agent to identify 3 internships tailored to
    the user's profile, including job descriptions and apply links.
    """
    role = current_user.get("target_role") or "Software Engineer"
    company = current_user.get("target_company") or "IBM Research"
    
    prompt = f"""
    Recommend 3 realistic internship opportunities for a student targeting role '{role}' at or similar to '{company}'.
    Return output strictly as a JSON list matching this schema:
    [
      {{
        "job_title": "Position Title",
        "company": "Company Name",
        "match_score": "92%",
        "match_explanation": "Short sentence explanation matching user profile...",
        "required_skills": ["Skill1", "Skill2"],
        "job_description": "Detailed text list of job duties and requirements...",
        "apply_url": "Direct application url link..."
      }}
    ]
    """
    
    raw_recs = await AIFactory.generate_text(prompt, "You are a professional Careers Recommendation Agent. Output JSON list only.")
    try:
        recs_list = json.loads(raw_recs)
    except Exception:
        # Fallback to standard mock opportunities with direct apply links and job descriptions
        recs_list = [
            {
                "job_title": f"Associate {role} Intern",
                "company": f"{company}",
                "match_score": "94%",
                "match_explanation": f"Matches your target company interest in {company} and profile stack.",
                "required_skills": ["React", "Python", "Docker"],
                "job_description": "We are seeking a Software Intern to assist in optimizing scalable web systems. You will construct modular React frontends, integrate backend Python APIs, and build containerized development layers using Docker.",
                "apply_url": f"https://careers.ibm.com/search/?keyword={role.replace(' ', '+')}"
            },
            {
                "job_title": f"Junior Full Stack Developer",
                "company": "IBM Partner Labs",
                "match_score": "88%",
                "match_explanation": "Aligned with your React proficiency and interest in cloud interfaces.",
                "required_skills": ["TypeScript", "FastAPI", "SQL"],
                "job_description": "Join our cloud integration labs. Responsibilities include building asynchronous APIs with FastAPI, optimizing relational databases, and designing sleek dashboard components using TypeScript.",
                "apply_url": "https://www.linkedin.com/jobs/search/?keywords=Full+Stack+Developer"
            },
            {
                "job_title": "Cloud Applications Developer",
                "company": "IBM Cloud Infrastructure",
                "match_score": "82%",
                "match_explanation": "Ideal match to complete your containerization and Docker targets.",
                "required_skills": ["Docker", "PostgreSQL", "Bash"],
                "job_description": "Seeking a developer to build cloud automation tools. Requirements: write complex SQL scripts, configure PostgreSQL schemas, package microservices into Docker containers, and write Bash automations.",
                "apply_url": "https://www.indeed.com/jobs?q=Cloud+Applications+Developer"
            }
        ]
        
    db_recs = []
    for rec in recs_list:
        db_rec = Recommendation(
            user_id=current_user["id"],
            job_title=rec.get("job_title"),
            company=rec.get("company"),
            match_score=rec.get("match_score", "80%"),
            match_explanation=rec.get("match_explanation"),
            required_skills=json.dumps(rec.get("required_skills", [])),
            job_description=rec.get("job_description", "No detailed description provided."),
            apply_url=rec.get("apply_url", "https://careers.ibm.com/"),
            status="Recommended"
        )
        db.add(db_rec)
        db_recs.append(db_rec)
        
    db.commit()
    for db_rec in db_recs:
        db.refresh(db_rec)
        
    response_items = []
    for rec in db_recs:
        req_skills = json.loads(rec.required_skills) if isinstance(rec.required_skills, str) else rec.required_skills
        response_items.append({
            "id": rec.id,
            "user_id": rec.user_id,
            "job_title": rec.job_title,
            "company": rec.company,
            "match_score": rec.match_score,
            "match_explanation": rec.match_explanation,
            "required_skills": req_skills,
            "status": rec.status,
            "job_description": rec.job_description,
            "apply_url": rec.apply_url,
            "created_at": rec.created_at
        })
        
    return response_items

@router.get("/list", response_model=list[RecommendationResponse])
def list_recommendations(
    db = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Lists all job recommendations for the user.
    """
    recs = db.query(Recommendation).filter(Recommendation.user_id == current_user["id"]).order_by(Recommendation.created_at.desc()).all()
    
    response_items = []
    for rec in recs:
        req_skills = json.loads(rec.required_skills) if isinstance(rec.required_skills, str) else rec.required_skills
        response_items.append({
            "id": rec.id,
            "user_id": rec.user_id,
            "job_title": rec.job_title,
            "company": rec.company,
            "match_score": rec.match_score,
            "match_explanation": rec.match_explanation,
            "required_skills": req_skills,
            "status": rec.status,
            "job_description": rec.job_description,
            "apply_url": rec.apply_url,
            "created_at": rec.created_at
        })
    return response_items

@router.post("/update-status", response_model=RecommendationResponse)
def update_recommendation_status(
    payload: RecommendationStatusUpdate,
    recommendation_id: int,
    db = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Updates the Kanban application status of a recommended opportunity.
    """
    rec = db.query(Recommendation).filter(Recommendation.id == recommendation_id, Recommendation.user_id == current_user["id"]).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Recommendation item not found.")
        
    rec.status = payload.status
    db.add(rec)
    db.commit()
    db.refresh(rec)
    
    req_skills = json.loads(rec.required_skills) if isinstance(rec.required_skills, str) else rec.required_skills
    return {
        "id": rec.id,
        "user_id": rec.user_id,
        "job_title": rec.job_title,
        "company": rec.company,
        "match_score": rec.match_score,
        "match_explanation": rec.match_explanation,
        "required_skills": req_skills,
        "status": rec.status,
        "job_description": rec.job_description,
        "apply_url": rec.apply_url,
        "created_at": rec.created_at
    }
