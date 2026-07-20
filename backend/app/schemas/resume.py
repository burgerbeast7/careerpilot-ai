from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime

class ResumeResponse(BaseModel):
    id: str
    user_id: str
    file_name: str
    file_path: str
    extracted_text: Optional[str] = None
    ats_score: int
    sections_data: Optional[Dict[str, Any]] = None
    keyword_analysis: Optional[Dict[str, Any]] = None
    analyzed_at: datetime

    class Config:
        from_attributes = True
