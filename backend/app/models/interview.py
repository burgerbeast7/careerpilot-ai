from sqlalchemy import Column, Integer, String, Float, ForeignKey, JSON, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.core.database import Base

class Interview(Base):
    __tablename__ = "interviews"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    session_type = Column(String, nullable=False)  # "Technical", "Behavioral", "Coding", etc.
    question_answers = Column(JSON, nullable=True)  # List of questions, responses, and AI evaluations
    overall_score = Column(Float, default=0.0)
    performance_metrics = Column(JSON, nullable=True)  # Accuracy, confidence, communication scores
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    user = relationship("User", back_populates="interviews")
