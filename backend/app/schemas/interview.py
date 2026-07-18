from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

class InterviewStartRequest(BaseModel):
    session_type: str  # "Technical", "Behavioral", "Coding", "General"

class InterviewAnswerRequest(BaseModel):
    question_index: int
    user_answer: str

class InterviewResponse(BaseModel):
    id: int
    user_id: int
    session_type: str
    question_answers: Optional[List[Dict[str, Any]]] = None
    overall_score: float
    performance_metrics: Optional[Dict[str, Any]] = None
    created_at: datetime

    class Config:
        from_attributes = True
