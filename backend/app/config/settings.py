from pydantic_settings import BaseSettings
from functools import lru_cache
import os

class Settings(BaseSettings):
    APP_NAME: str = "FitMind AI API"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = True
    MONGODB_URL: str = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
    DATABASE_NAME: str = "fitmind"
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_SECRET_KEY: str = os.getenv("SUPABASE_SECRET_KEY", "")
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    CLOUDFLARE_R2_URL: str = os.getenv("CLOUDFLARE_R2_URL", "")
    CLOUDFLARE_R2_TOKEN: str = os.getenv("CLOUDFLARE_R2_TOKEN", "")
    CLOUDFLARE_R2_ACCESS_KEY: str = os.getenv("CLOUDFLARE_R2_ACCESS_KEY", "")
    CLOUDFLARE_R2_SECRET_KEY: str = os.getenv("CLOUDFLARE_R2_SECRET_KEY", "")
    CLOUDFLARE_R2_BUCKET: str = os.getenv("CLOUDFLARE_R2_BUCKET", "")
    CLOUDFLARE_R2_PUBLIC_URL: str = os.getenv("CLOUDFLARE_R2_PUBLIC_URL", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-3.1-flash-lite")
    GROQ_WHISPER_MODEL: str = os.getenv("GROQ_WHISPER_MODEL", "whisper-large-v3")
    JWT_SECRET: str = os.getenv("JWT_SECRET", "your-secret-key-change-in-production")
    JWT_ALGORITHM: str = "HS256"
    DATABASE_ENV: str = os.getenv("DATABASE_ENV", "local")
    ALLOWED_ORIGINS: list = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]
    # Regex allowing any localhost/127.0.0.1 port in development so Vite's
    # auto-incremented dev ports (5173/5174/5175/...) all work without edits.
    ALLOWED_ORIGIN_REGEX: str = r"https?://(localhost|127\.0\.0\.1)(:\d+)?"

    class Config:
        env_file = ".env.local"
        case_sensitive = True

@lru_cache()
def get_settings():
    return Settings()
