from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings

from app.routers import auth, resume, skill_gap, roadmap, interview, document, recommendation, chat, dashboard




from app.core.database import get_mongo_db
import pymongo

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Enterprise Multi-Agent Career Copilot Platform",
    version="1.0.0",
)

@app.on_event("startup")
def startup_db_client():
    db = get_mongo_db()
    db.users.create_index([("email", pymongo.ASCENDING)], unique=True)

# CORS configuration
origins = [
    "http://localhost:5173",  # Vite default port
    "http://127.0.0.1:5173",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex="https://.*\\.vercel\\.app",  # Support all Vercel deployment subdomains and previews
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(resume.router, prefix=settings.API_V1_STR)
app.include_router(skill_gap.router, prefix=settings.API_V1_STR)
app.include_router(roadmap.router, prefix=settings.API_V1_STR)
app.include_router(interview.router, prefix=settings.API_V1_STR)
app.include_router(document.router, prefix=settings.API_V1_STR)
app.include_router(recommendation.router, prefix=settings.API_V1_STR)
app.include_router(chat.router, prefix=settings.API_V1_STR)
app.include_router(dashboard.router, prefix=settings.API_V1_STR)

@app.get("/")
def read_root():
    return {
        "message": "Welcome to CareerPilot AI API Gateway",
        "status": "Online",
        "docs": "/docs"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
