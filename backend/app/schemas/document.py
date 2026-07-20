from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class DocumentCreate(BaseModel):
    doc_type: str  # "Resume", "Cover Letter", "LinkedIn", "Cold Email"
    title: str
    content_text: str

class DocumentResponse(BaseModel):
    id: str
    user_id: str
    doc_type: str
    title: str
    content_text: str
    pdf_path: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
