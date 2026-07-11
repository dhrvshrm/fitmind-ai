from fastapi.middleware.cors import CORSMiddleware
from .settings import get_settings

def setup_cors(app):
    """Setup CORS middleware"""
    settings = get_settings()
    
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ALLOWED_ORIGINS,
        allow_origin_regex=settings.ALLOWED_ORIGIN_REGEX,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
