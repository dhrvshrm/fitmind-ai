from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache
import os

# Placeholder JWT secret used only for local development. Production refuses
# to start with it (see ``Settings.validate_for_production``).
DEV_JWT_SECRET = "your-secret-key-change-in-production"
MIN_JWT_SECRET_LENGTH = 32


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env.local", case_sensitive=True)

    APP_NAME: str = "FitMind AI API"
    APP_VERSION: str = "0.2.0"
    DEBUG: bool = False
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
    GROQ_CHAT_MODEL: str = os.getenv("GROQ_CHAT_MODEL", "openai/gpt-oss-20b")
    # Model used when Groq serves a structured (JSON) request as a fallback.
    GROQ_JSON_MODEL: str = os.getenv("GROQ_JSON_MODEL", "openai/gpt-oss-20b")
    # Per-user cap on AI calls per local day, to stay inside free-tier quotas.
    AI_DAILY_QUOTA: int = int(os.getenv("AI_DAILY_QUOTA", "150"))
    # Seconds before an AI provider call is abandoned.
    AI_TIMEOUT_SECONDS: float = float(os.getenv("AI_TIMEOUT_SECONDS", "30"))
    # Coach (tool use): provider order and models, chosen by scripts/eval_coach_tools.py.
    # An empty model means the provider's default model above.
    COACH_PROVIDERS: str = os.getenv("COACH_PROVIDERS", "gemini,groq")
    COACH_GEMINI_MODEL: str = os.getenv("COACH_GEMINI_MODEL", "")
    COACH_GROQ_MODEL: str = os.getenv("COACH_GROQ_MODEL", "")
    JWT_SECRET: str = os.getenv("JWT_SECRET", DEV_JWT_SECRET)
    JWT_ALGORITHM: str = "HS256"
    # local | test | staging | production
    DATABASE_ENV: str = os.getenv("DATABASE_ENV", "local")
    ALLOWED_ORIGINS: list = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]
    # Regex allowing any localhost/127.0.0.1 port in development so Vite's
    # auto-incremented dev ports (5173/5174/5175/...) all work without edits.
    ALLOWED_ORIGIN_REGEX: str = r"https?://(localhost|127\.0\.0\.1)(:\d+)?"
    # Comma-separated production origins (e.g. "https://app.fitmind.ai").
    CORS_EXTRA_ORIGINS: str = os.getenv("CORS_EXTRA_ORIGINS", "")
    # Per-IP request budget for the rate limiter.
    RATE_LIMIT_MAX_REQUESTS: int = int(os.getenv("RATE_LIMIT_MAX_REQUESTS", "100"))
    RATE_LIMIT_WINDOW_SECONDS: int = int(os.getenv("RATE_LIMIT_WINDOW_SECONDS", "60"))
    # Phase 7 (habit loop). Product analytics: events are always stored locally;
    # they are also forwarded to PostHog when a project API key is set.
    POSTHOG_API_KEY: str = os.getenv("POSTHOG_API_KEY", "")
    POSTHOG_HOST: str = os.getenv("POSTHOG_HOST", "https://us.i.posthog.com")
    # Web Push (VAPID). Reminders switch themselves off when the keys are missing;
    # generate a pair with scripts/generate_vapid_keys.py.
    VAPID_PUBLIC_KEY: str = os.getenv("VAPID_PUBLIC_KEY", "")
    VAPID_PRIVATE_KEY: str = os.getenv("VAPID_PRIVATE_KEY", "")
    VAPID_SUBJECT: str = os.getenv("VAPID_SUBJECT", "")
    # Shared secret for the external cron that triggers reminders while the server sleeps.
    CRON_SECRET: str = os.getenv("CRON_SECRET", "")

    @property
    def is_production(self) -> bool:
        """True for deployed environments, where unsafe fallbacks are disabled."""
        return self.DATABASE_ENV.lower() in ("production", "staging")

    @property
    def allows_memory_fallback(self) -> bool:
        """The in-memory store is a local-development convenience only."""
        return not self.is_production

    def validate_for_production(self) -> None:
        """Refuse to start a deployed environment with unsafe settings.

        Raises:
            RuntimeError: listing every unsafe setting found.
        """
        if not self.is_production:
            return
        problems = []
        if self.JWT_SECRET == DEV_JWT_SECRET or len(self.JWT_SECRET) < MIN_JWT_SECRET_LENGTH:
            problems.append(
                f"JWT_SECRET must be set to a random value of at least {MIN_JWT_SECRET_LENGTH} characters"
            )
        if self.DEBUG:
            problems.append("DEBUG must be false")
        if not self.CORS_EXTRA_ORIGINS.strip():
            problems.append("CORS_EXTRA_ORIGINS must list the deployed frontend origin(s)")
        if problems:
            raise RuntimeError("Unsafe production configuration: " + "; ".join(problems))


@lru_cache()
def get_settings():
    return Settings()
