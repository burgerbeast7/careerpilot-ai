from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from fastapi.responses import StreamingResponse
from datetime import datetime, timezone
from bson import ObjectId
from app.core.database import get_mongo_db
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
    db = Depends(get_db),
    current_user: dict = Depends(get_current_user)
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
    
    role = target_role or current_user.get("target_role") or "Software Engineer"
    company = target_company or current_user.get("target_company") or "IBM"
    
    db_resume = {
        "user_id": current_user["id"],
        "file_name": file.filename,
        "file_path": f"uploads/{file.filename}",
        "extracted_text": extracted_text,
        "ats_score": 0,
        "analyzed_at": datetime.now(timezone.utc)
    }
    result = db.resumes.insert_one(db_resume)
    db_resume["_id"] = result.inserted_id
    db_resume["id"] = str(db_resume["_id"])
    
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
                        
                        mongo_db = get_mongo_db()
                        mongo_db.resumes.update_one(
                            {"_id": db_resume["_id"]},
                            {"$set": {
                                "ats_score": result.get("ats_score", 70),
                                "sections_data": result.get("sections_data"),
                                "keyword_analysis": result.get("keyword_analysis")
                            }}
                        )
                except Exception as e:
                    print(f"Error updating resume db: {e}")
            yield message
            
    return StreamingResponse(sse_generator(), media_type="text/event-stream")

@router.get("/history", response_model=list[ResumeResponse])
def get_resume_history(
    db = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Fetches the resume history for the authenticated user.
    """
    resumes = list(db.resumes.find({"user_id": current_user["id"]}).sort("analyzed_at", -1))
    for r in resumes:
        r["id"] = str(r["_id"])
    return resumes
