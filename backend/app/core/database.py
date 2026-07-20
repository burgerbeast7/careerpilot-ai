from pymongo import MongoClient
from app.core.config import settings
from urllib.parse import quote_plus


def _build_mongo_uri(raw_uri: str) -> str:
    """
    Build a safe MongoDB URI, URL-encoding the password if it contains
    special characters like @, #, %, etc.
    """
    if not raw_uri:
        raise ValueError("MONGODB_URI is not set")

    raw_uri = str(raw_uri).strip().strip("'").strip('"')

    # If it already looks like a full SRV URI, try to parse and re-encode password
    if "mongodb+srv://" in raw_uri or "mongodb://" in raw_uri:
        try:
            scheme, rest = raw_uri.split("://", 1)
            if "@" in rest:
                cred_part, host_part = rest.split("@", 1)
                if ":" in cred_part:
                    user, password = cred_part.split(":", 1)
                    safe_password = quote_plus(password)
                    return f"{scheme}://{user}:{safe_password}@{host_part}"
        except Exception:
            pass

    return raw_uri


# Build the MongoDB client
_mongo_uri = _build_mongo_uri(settings.MONGODB_URI)
print(f"[DB] Connecting to MongoDB: {settings.MONGODB_DB_NAME}")

client = MongoClient(_mongo_uri)
database = client[settings.MONGODB_DB_NAME]


def get_db():
    """FastAPI dependency that yields the MongoDB database instance."""
    return database


def get_mongo_db():
    """
    Get a fresh reference to the MongoDB database.
    Use this inside SSE streaming generators or background tasks
    where FastAPI's Depends() is not available.
    """
    return database
