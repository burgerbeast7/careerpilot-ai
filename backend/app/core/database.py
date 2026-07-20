from sqlalchemy import create_engine
from sqlalchemy.engine import URL
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

import re


def build_engine(raw_url: str):
    """
    Build a SQLAlchemy engine from a raw DATABASE_URL string.

    Uses SQLAlchemy's URL.create() to pass each component (user, password,
    host, port, database) individually. This completely avoids URL-parsing
    issues caused by special characters (@, #, %, etc.) in the password.
    """
    if not raw_url:
        raise ValueError("DATABASE_URL is not set")

    raw_url = str(raw_url).strip().strip("'").strip('"')

    # ---------- SQLite (local dev) ----------
    if raw_url.startswith("sqlite"):
        return create_engine(raw_url, connect_args={"check_same_thread": False})

    # ---------- PostgreSQL ----------
    # Normalise the scheme first
    url = raw_url
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)

    # Parse with a regex so the password is never mis-split on '@'
    # Expected format:  postgresql://USER:PASSWORD@HOST:PORT/DBNAME
    pattern = re.compile(
        r"^(?P<scheme>postgresql(?:\+\w+)?)"   # scheme
        r"://"
        r"(?P<user>[^:]+)"                     # username (up to first ':')
        r":(?P<password>.+)"                   # password (everything until last '@')
        r"@(?P<host>[^/:]+)"                   # host (after last '@')
        r":(?P<port>\d+)"                      # port
        r"/(?P<database>.+)$"                  # database name
    )

    # Use rsplit on '@' to correctly handle passwords containing '@'
    # Split: "scheme://user:pass@word" | "host:port/db"
    if "@" not in url:
        raise ValueError(f"Invalid DATABASE_URL format (no '@' found): {url[:30]}...")

    cred_part, host_part = url.rsplit("@", 1)

    # cred_part = "postgresql://user:password"
    scheme_and_auth = cred_part.split("://", 1)
    if len(scheme_and_auth) != 2:
        raise ValueError(f"Invalid DATABASE_URL format (no '://' found)")

    scheme = scheme_and_auth[0]          # "postgresql"
    auth = scheme_and_auth[1]            # "user:password"
    user, password = auth.split(":", 1)  # split on FIRST ':' only

    # host_part = "host:port/database"
    host_port, database = host_part.split("/", 1)
    host, port_str = host_port.rsplit(":", 1)
    port = int(port_str)

    # Normalise dialect name
    if scheme == "postgres":
        scheme = "postgresql"

    print(f"[DB] Connecting to {scheme}://{user}:****@{host}:{port}/{database}")

    sa_url = URL.create(
        drivername=scheme,
        username=user,
        password=password,       # passed raw — no manual encoding needed
        host=host,
        port=port,
        database=database,
    )

    return create_engine(sa_url)


engine = build_engine(settings.DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
