from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from datetime import datetime

class RoadmapRequest(BaseModel):
    duration_weeks: str  # "4", "8", or "12"
    recommendation_id: Optional[int] = None

class TaskUpdate(BaseModel):
    week_index: int
    task_index: int
    completed: bool

class RoadmapResponse(BaseModel):
    id: int
    user_id: int
    duration_weeks: str
    weekly_goals: Optional[List[str]] = None
    tasks_data: Optional[List[Dict[str, Any]]] = None
    progress_percentage: float
    created_at: datetime

    class Config:
        from_attributes = True
