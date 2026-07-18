from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

class SkillGapRequest(BaseModel):
    target_role: str
    target_company: Optional[str] = None
    current_skills: List[str]

class SkillGapResponse(BaseModel):
    id: int
    user_id: int
    target_role: str
    target_company: Optional[str] = None
    current_skills: Optional[List[str]] = None
    missing_skills: Optional[Dict[str, Any]] = None
    recommendations: Optional[List[Dict[str, Any]]] = None
    analyzed_at: datetime

    class Config:
        from_attributes = True
