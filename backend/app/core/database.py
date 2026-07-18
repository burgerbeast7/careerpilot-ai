from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

from urllib.parse import quote_plus, unquote

def get_safe_db_url(url: str) -> str:
    if not url or url.startswith("sqlite"):
        return url
    try:
        if "@" in url:
            # Split into scheme+user+pass and host+db
            cred_part, host_part = url.rsplit("@", 1)
            scheme, auth = cred_part.split("://", 1)
            if ":" in auth:
                user, password = auth.split(":", 1)
                # Unquote first to prevent double-encoding, then safely quote
                encoded_password = quote_plus(unquote(password))
                cred_part = f"{scheme}://{user}:{encoded_password}"
            return f"{cred_part}@{host_part}"
    except Exception:
        pass
    return url

# If using SQLite, allow multiple threads to access it (development convenience)
connect_args = {}
db_url = get_safe_db_url(settings.DATABASE_URL)
if db_url.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(
    db_url,
    connect_args=connect_args
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
