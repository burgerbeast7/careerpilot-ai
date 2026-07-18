from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

class RecommendationStatusUpdate(BaseModel):
    status: str  # "Recommended", "Applied", "Interviewing", "Offered", "Rejected"

class RecommendationResponse(BaseModel):
    id: int
    user_id: int
    job_title: str
    company: str
    match_score: str
    match_explanation: Optional[str] = None
    required_skills: Optional[List[str]] = None
    status: str
    job_description: Optional[str] = None
    apply_url: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
