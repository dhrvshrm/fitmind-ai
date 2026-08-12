# Contributing to FitMind AI

Thanks for your interest! This is primarily a portfolio project, but issues and PRs are welcome.

## Getting started

See the [root README](README.md) for a full quick start. TL;DR:

```bash
# Backend
cd backend && python -m venv venv && source venv/bin/activate
pip install -r requirements.txt && uvicorn app.main:app --reload

# Frontend
cd frontend && npm install && npm run dev
```

The app runs with **no API keys** (in-memory store + AI fallbacks), so you can develop most features without external services.

## Project conventions

### Backend (Python / FastAPI)
- **Layering:** `endpoint → service → model`. Endpoints stay thin (validate, call a service, return the envelope). Business logic lives in `services/`; persistence in `models/`.
- **Response envelope:** every endpoint returns `{ success, message, data }`. Errors are normalised to the same shape by the global handlers — raise `HTTPException` or a domain error, don't hand-roll error JSON.
- **Graceful degradation:** new models should support the in-memory fallback (`get_database()` may return `None`); new external integrations should be soft-imported and optional.
- **Type hints + docstrings** on public functions. Keep the existing comment density.
- Run `pytest` before opening a PR.

### Frontend (React / TypeScript)
- **`type` over `interface`.**
- **Styles live in colocated `*.styles.ts`** files (MUI `sx` objects) — no inline style objects in components.
- **No hardcoded UI strings** — all copy goes in `src/constants/strings.ts`.
- API access goes through a typed client in `src/services/`; unwrap the `{ success, message, data }` envelope there.
- Run `npm run build` (typecheck + build) before opening a PR.

## Commit messages

Conventional-commit style prefixes are used in history:

```
feat: add weekly leaderboard endpoint
fix: correct CORS origin handling in production
chore: add Dockerfile for backend
style: refine sidebar gradient
docs: expand backend README
```

## Pull requests

1. Branch off `main`.
2. Keep PRs focused; describe what changed and how you verified it.
3. Ensure `pytest` (backend) and `npm run build` (frontend) pass.
4. Update the relevant README/docs if you change behaviour or env vars.

## Reporting bugs

Open an issue with steps to reproduce, expected vs. actual behaviour, and environment details (OS, Python/Node version).
