# FitMind AI — Backend

FastAPI backend for FitMind AI: auth, AI workout generation, voice/mood analysis, recovery scoring, nutrition, gamification, real-time chat + notifications, friends, and weekly reports.

<p>
  <img alt="FastAPI" src="https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white" />
  <img alt="Python" src="https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white" />
  <img alt="MongoDB" src="https://img.shields.io/badge/MongoDB-Motor-47A248?logo=mongodb&logoColor=white" />
  <img alt="Docker" src="https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white" />
</p>

## Architecture

Layered, per domain: **`endpoint → service → model`**.

- `app/api/v1/endpoints/*` — thin routers; validate input, call a service, return the envelope.
- `app/services/*` — business logic (auth, workout, gamification, notifications, …).
- `app/models/*` — persistence. Each model works against MongoDB **and** an in-memory fallback, so the app runs without a database.
- `app/middleware/*` — global error handlers (consistent `{success, message, data}` on every error), a 100-req/min-per-IP rate limiter, and request logging.
- `app/websockets/*` — a `ConnectionManager` + handlers for the streaming chat / live notifications.
- `app/background_jobs/*` — APScheduler jobs (streak warning @ 8 PM daily; weekly report @ Sun 9 PM).
- `app/config/*` — settings (pydantic-settings), Mongo connection + index creation, CORS.

**Graceful degradation:** no `MONGODB_URL`/unreachable DB → in-memory store; no `GROQ`/`GEMINI` key → deterministic fallbacks; no R2 config → audio upload skipped. Nothing hard-fails.

## Run locally

```bash
cd backend
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env.local
uvicorn app.main:app --reload
```

- Swagger UI: http://localhost:8000/docs
- Health: http://localhost:8000/health

## Environment variables

Copy `.env.example` → `.env.local` and fill in:

| Variable | Required | Notes |
|---|---|---|
| `MONGODB_URL` | for persistence | `mongodb://localhost:27017` or an Atlas `mongodb+srv://…` URL |
| `JWT_SECRET` | ✅ | any long random string |
| `DATABASE_ENV` | ✅ | `local` \| `production` (production tightens CORS) |
| `GROQ_API_KEY` | for AI | console.groq.com — Whisper + Llama 3.3 |
| `GEMINI_API_KEY` | for AI | aistudio.google.com — plans/mood/reports |
| `GEMINI_MODEL` | optional | default `gemini-3.1-flash-lite` |
| `GROQ_CHAT_MODEL` | optional | default `llama-3.3-70b-versatile` |
| `CLOUDFLARE_R2_URL` / `_ACCESS_KEY` / `_SECRET_KEY` / `_BUCKET` | optional | voice-audio storage |
| `CORS_EXTRA_ORIGINS` | production | comma-separated frontend origins |
| `RATE_LIMIT_MAX_REQUESTS` / `_WINDOW_SECONDS` | optional | defaults 100 / 60 |

## API surface (52 endpoints + WebSocket)

All responses use `{ success: bool, message: str, data: any }`. Protected routes need `Authorization: Bearer <token>`.

| Group | Endpoints |
|---|---|
| **Auth** | `POST /auth/register`, `POST /auth/login`, `GET /auth/me`, `POST /auth/logout` |
| **Users** | `POST /users/onboarding`, `GET/PUT /users/profile` |
| **Recovery** | `POST /recovery/log`, `GET /recovery/score/today`, `GET /recovery/history` |
| **Voice** | `POST /checkin/voice` (multipart), `GET /checkin/history` |
| **Workouts** | `POST /workouts/generate`, `GET /workouts/plan/week`, `GET /workouts/plan/today`, `POST /workouts/log`, `GET /workouts/history`, `PUT /workouts/exercise/complete` |
| **Nutrition** | `POST /nutrition/meal`, `GET /nutrition/today`, `GET /nutrition/history`, `POST /nutrition/water` |
| **Gamification** | `GET /gamification/profile`, `POST /gamification/xp`, `GET /gamification/badges` |
| **Dashboard** | `GET /dashboard/{summary,mood-performance,weight-trend,workout-rate,xp-weekly,recovery-trend}` |
| **Notifications** | `GET /notifications`, `POST /notifications/{id}/read` |
| **Friends** | `POST /friends/request`, `PUT /friends/accept/{id}`, `PUT /friends/decline/{id}`, `GET /friends/list`, `GET /friends/requests`, `POST /friends/nudge/{id}`, `GET /friends/{username}` |
| **Leaderboard** | `GET /leaderboard/weekly` |
| **Reports** | `GET /reports/history`, `GET /reports/latest`, `GET /reports/{id}`, `POST /reports/generate` |
| **Settings** | `GET/PUT /settings/profile`, `PUT /settings/goals`, `PUT /settings/preferences`, `PUT /settings/password`, `DELETE /settings/account` |
| **WebSocket** | `ws://…/ws/{user_id}` — streaming chat + live notifications |
| **Health** | `GET /`, `GET /health`, `GET /api/v1/health` |

Full details + try-it-out: **[/docs](https://fitmind-backend-vr5y.onrender.com/docs)**. Grouped reference: [`../docs/API.md`](../docs/API.md).

## Testing

```bash
pytest              # test suite
pytest -q           # quiet
```

## Deploy to Render

1. Push to GitHub.
2. Render → **New + → Blueprint** → select this repo (reads [`../render.yaml`](../render.yaml)).
3. Fill secret env vars (`MONGODB_URL`, `JWT_SECRET`, `GROQ_API_KEY`, `GEMINI_API_KEY`, …); `DATABASE_ENV=production` is preset.
4. **Atlas → Network Access → add `0.0.0.0/0`** (Render IPs are dynamic).
5. Deploy. After the frontend is live, set `CORS_EXTRA_ORIGINS` to its origin.

The Docker image binds uvicorn to Render's `$PORT`. Health check: `/health`.

> **Note:** on Render's free tier the service sleeps when idle, so the APScheduler jobs (streak warning, weekly report) won't fire reliably — use an always-on instance or Render Cron for production scheduling.
