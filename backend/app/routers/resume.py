from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import json

from app.core.database import get_db
from app.routers.auth import get_current_user
from app.models.user import User
from app.models.resume import Resume
from app.schemas.resume import ResumeResponse
from app.services.parser import FileParser
from app.services.agents import CareerAgents

router = APIRouter(prefix="/resume", tags=["resume"])

@router.post("/analyze")
async def analyze_resume(
    file: UploadFile = File(...),
    target_role: str = Form(None),
    target_company: str = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Uploads a resume file, parses text, and yields a real-time SSE stream of multi-agent
    coordination, writing the final ATS score and sections directly to PostgreSQL.
    """
    file_bytes = await file.read()
    
    try:
        extracted_text = FileParser.parse_file(file.filename, file_bytes)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    role = target_role or current_user.target_role or "Software Engineer"
    company = target_company or current_user.target_company or "IBM"
    
    # Create placeholder resume record
    db_resume = Resume(
        user_id=current_user.id,
        file_name=file.filename,
        file_path=f"uploads/{file.filename}",  # dev path
        extracted_text=extracted_text,
        ats_score=0
    )
    db.add(db_resume)
    db.commit()
    db.refresh(db_resume)
    
    # Custom SSE generator to update the DB when the pipeline completes
    async def sse_generator():
        async for message in CareerAgents.run_orchestrator("resume_analysis", {
            "file_text": extracted_text,
            "target_role": role,
            "target_company": company
        }):
            if "complete" in message:
                clean_msg = message.replace("data: ", "").strip()
                try:
                    payload = json.loads(clean_msg)
                    if payload.get("event") == "complete":
                        result = payload.get("result", {})
                        
                        # Update DB entry with final results
                        db_resume.ats_score = result.get("ats_score", 70)
                        db_resume.sections_data = result.get("sections_data")
                        db_resume.keyword_analysis = result.get("keyword_analysis")
                        db.add(db_resume)
                        db.commit()
                except Exception as e:
                    print(f"Error updating resume db: {e}")
            yield message
            
    return StreamingResponse(sse_generator(), media_type="text/event-stream")

@router.get("/history", response_model=list[ResumeResponse])
def get_resume_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Fetches the resume history for the authenticated user.
    """
    resumes = db.query(Resume).filter(Resume.user_id == current_user.id).order_by(Resume.analyzed_at.desc()).all()
    return resumes
