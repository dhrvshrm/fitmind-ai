import logging

from fastapi.middleware.cors import CORSMiddleware

from .settings import get_settings

logger = logging.getLogger(__name__)


def setup_cors(app) -> None:
    """Configure CORS for the current environment.

    Development also allows the localhost ``ALLOWED_ORIGINS`` and any
    localhost port via a regex so Vite's shifting dev ports work. Production
    only allows the comma-separated ``CORS_EXTRA_ORIGINS`` from the
    environment. Auth uses bearer tokens, not cookies, so credentials are
    never needed cross-origin.
    """
    settings = get_settings()
    is_production = settings.is_production

    origins = [] if is_production else list(settings.ALLOWED_ORIGINS)
    extra = [o.strip() for o in settings.CORS_EXTRA_ORIGINS.split(",") if o.strip()]
    origins.extend(extra)

    kwargs = dict(
        allow_origins=origins,
        allow_credentials=False,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
        allow_headers=["*"],
    )
    if not is_production:
        kwargs["allow_origin_regex"] = settings.ALLOWED_ORIGIN_REGEX

    app.add_middleware(CORSMiddleware, **kwargs)
    logger.info(
        "CORS configured (production=%s, origins=%s)", is_production, origins
    )
