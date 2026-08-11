import logging

from fastapi.middleware.cors import CORSMiddleware

from .settings import get_settings

logger = logging.getLogger(__name__)


def setup_cors(app) -> None:
    """Configure CORS for the current environment.

    Development (``DATABASE_ENV`` != "production") also allows any localhost
    port via a regex so Vite's shifting dev ports work. Production drops the
    permissive regex and only allows the explicit ``ALLOWED_ORIGINS`` plus any
    comma-separated ``CORS_EXTRA_ORIGINS`` from the environment.
    """
    settings = get_settings()
    is_production = settings.DATABASE_ENV.lower() == "production"

    origins = list(settings.ALLOWED_ORIGINS)
    extra = [o.strip() for o in settings.CORS_EXTRA_ORIGINS.split(",") if o.strip()]
    origins.extend(extra)

    kwargs = dict(
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
        allow_headers=["*"],
    )
    if not is_production:
        kwargs["allow_origin_regex"] = settings.ALLOWED_ORIGIN_REGEX

    app.add_middleware(CORSMiddleware, **kwargs)
    logger.info(
        "CORS configured (production=%s, origins=%s)", is_production, origins
    )
