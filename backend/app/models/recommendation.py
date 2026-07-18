from sqlalchemy import Column, Integer, String, Text, ForeignKey, JSON, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.core.database import Base

class Recommendation(Base):
    __tablename__ = "recommendations"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    job_title = Column(String, nullable=False)
    company = Column(String, nullable=False)
    match_score = Column(String, nullable=False)  # e.g., "92%"
    match_explanation = Column(Text, nullable=True)
    required_skills = Column(JSON, nullable=True)
    status = Column(String, default="Recommended")  # Recommended, Applied, Interviewing, Offered, Rejected
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    user = relationship("User", back_populates="recommendations")
