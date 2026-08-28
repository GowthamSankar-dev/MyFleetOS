"""
Application configuration — reads from environment variables with sane defaults.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator

class Settings(BaseSettings):
    # ── Database ───────────────────────────────────────────────────────────────
    # asyncpg-based URL for SQLAlchemy async engine
    DATABASE_URL: str = (
        "postgresql+asyncpg://fleet_user:fleet_pass@localhost:5432/fleet_db"
    )

    @field_validator("DATABASE_URL", mode="before")
    def fix_database_url(cls, v: str) -> str:
        if not v:
            return v
        if v.startswith("postgres://"):
            v = v.replace("postgres://", "postgresql+asyncpg://", 1)
        elif v.startswith("postgresql://"):
            v = v.replace("postgresql://", "postgresql+asyncpg://", 1)
            
        # Fix unencoded special characters in password (like multiple '@')
        if v.count("@") > 1:
            try:
                scheme_part, rest = v.split("://", 1)
                credentials, host_part = rest.rsplit("@", 1)
                if ":" in credentials:
                    user, password = credentials.split(":", 1)
                    from urllib.parse import quote, unquote
                    password = quote(unquote(password))
                    v = f"{scheme_part}://{user}:{password}@{host_part}"
            except Exception:
                pass
                
        return v

    # ── Server ─────────────────────────────────────────────────────────────────
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = True

    # ── JWT Auth ───────────────────────────────────────────────────────────────
    JWT_SECRET: str = ""

    @field_validator("JWT_SECRET", mode="before")
    def require_jwt_secret(cls, v: str) -> str:
        if not v:
            raise ValueError(
                "JWT_SECRET is not set. Add it to your .env file before starting the server."
            )
        return v

    # ── CORS ───────────────────────────────────────────────────────────────────
    # Add your frontend origin here
    ALLOWED_ORIGINS: list[str] = [
        "http://localhost:5173",   # Vite dev server
        "http://localhost:3000",
        "https://showmyfleet.app",
        "https://www.showmyfleet.app",
    ]

    @field_validator("ALLOWED_ORIGINS", mode="before")
    def parse_allowed_origins(cls, v):
        if isinstance(v, str):
            # If the env var is a plain string but not valid JSON, split by comma
            import json
            try:
                parsed = json.loads(v)
                if isinstance(parsed, list):
                    return parsed
            except json.JSONDecodeError:
                pass
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v

    # ── Tracking & OSRM ────────────────────────────────────────────────────────
    OSRM_BASE_URL: str = "http://router.project-osrm.org"
    MAP_MATCHING_ENABLED: bool = True
    GPS_OUTLIER_THRESHOLD_KMH: float = 200.0

    # ── Email Settings ────────────────────────────────────────────────────────
    SMTP_EMAIL: str = ""          # e.g., "your_email@gmail.com"
    SMTP_APP_PASSWORD: str = ""   # (Unused, keeping for legacy compatibility)
    GMAIL_CLIENT_ID: str = ""
    GMAIL_CLIENT_SECRET: str = ""
    GMAIL_REFRESH_TOKEN: str = ""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )


# Single shared instance
settings = Settings()
