"""The action-taking coach: tool registry, built-in tools, context blocks and menu advice.

Importing this package registers the built-in tools and context blocks.
"""
from app.coach import context as _context  # noqa: F401  (registers context blocks)
from app.coach import tools as _tools  # noqa: F401  (registers tools)
from app.coach import menu as _menu  # noqa: F401,E402  (registers suggest_from_menu)
