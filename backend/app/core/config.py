from pydantic_settings import BaseSettings
from typing import Optional
import os

class Settings(BaseSettings):
    PROJECT_NAME: str = "CareerPilot AI (Enterprise Edition)"
    API_V1_STR: str = "/api/v1"
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8  # 8 days
    
    # Database (MongoDB)
    MONGODB_URI: str = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
    MONGODB_DB_NAME: str = os.getenv("MONGODB_DB_NAME", "careerpilot")
    
    # AI Config
    # Supports: "mock", "openai", "gemini", "watsonx", "groq"
    AI_PROVIDER: str = os.getenv("AI_PROVIDER", "mock")
    
    OPENAI_API_KEY: Optional[str] = os.getenv("OPENAI_API_KEY", None)
    GEMINI_API_KEY: Optional[str] = os.getenv("GEMINI_API_KEY", None)
    
    WATSONX_API_KEY: Optional[str] = os.getenv("WATSONX_API_KEY", None)
    WATSONX_PROJECT_ID: Optional[str] = os.getenv("WATSONX_PROJECT_ID", None)
    WATSONX_URL: str = os.getenv("WATSONX_URL", "https://us-south.ml.cloud.ibm.com")
    
    GROQ_API_KEY: Optional[str] = os.getenv("GROQ_API_KEY", None)

    class Config:
        case_sensitive = True

settings = Settings()
