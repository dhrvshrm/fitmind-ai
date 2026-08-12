# 🏋️ FitMind AI - AI Powered Fitness Coach

> A full-stack, AI-native fitness SaaS: voice mood detection, adaptive AI workout plans, a real-time streaming AI coach, gamification, social features, and automated weekly insights.

<p>
  <img alt="React" src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white" />
  <img alt="FastAPI" src="https://img.shields.io/badge/FastAPI-0.11x-009688?logo=fastapi&logoColor=white" />
  <img alt="Python" src="https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white" />
  <img alt="MongoDB" src="https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=white" />
  <img alt="MUI" src="https://img.shields.io/badge/MUI-6-007FFF?logo=mui&logoColor=white" />
  <img alt="Docker" src="https://img.shields.io/badge/Docker-ready-2496ED?logo=docker&logoColor=white" />
  <img alt="License" src="https://img.shields.io/badge/License-MIT-yellow" />
</p>

**Live demo:** 🌐 [fitmind-ai-lyart.vercel.app](https://fitmind-ai-lyart.vercel.app) &nbsp;·&nbsp; **API docs:** 📖 [/docs](https://fitmind-backend-vr5y.onrender.com/docs) &nbsp;·&nbsp; **Demo video:** 🎬 _add link_

> ⏳ The backend runs on Render's free tier and sleeps after ~15 min idle — the first request may take 30-60s to wake it up.

---

## ✨ Overview

FitMind AI is a coaching platform that adapts to how you actually feel. You record a quick **voice check-in**; Groq Whisper transcribes it and Gemini reads your **mood and energy**. That signal — plus a daily **recovery score** — feeds an AI that generates a **weekly workout plan** tuned to your readiness. As you train, eat, and check in, you **earn XP, climb levels, unlock badges**, compete with friends on a **weekly leaderboard**, and get an **AI-written weekly report**. A **real-time AI coach** (streaming over WebSocket) answers questions with full context of your plan, recovery, and mood.

It's built as a clean, layered monorepo — **endpoints → services → models** on the backend, and a **service/type/component** architecture on the frontend — with graceful degradation everywhere (every external dependency has a fallback, so the app runs even without a database or AI keys).

## 🚀 Features

| Domain | What it does |
|---|---|
| 🔐 **Auth & Onboarding** | JWT auth (bcrypt-hashed passwords), multi-step onboarding, BMI/TDEE computed from profile |
| 🎙️ **Voice Check-In** | Record audio → **Groq Whisper** transcribes → **Gemini** detects mood + energy (1–10); audio stored in **Cloudflare R2** |
| 😌 **Recovery Intelligence** | Daily sleep/stress/soreness → 0–100 recovery score + rest/light/hard recommendation |
| 🤖 **AI Workout Planner** | **Gemini** generates a 7-day plan, **adapted to your recovery score & mood**; robust JSON parsing with a template fallback |
| 💪 **Workout Logging** | Log sessions, mark exercises done, earn XP, track streaks & completion rate |
| 🥗 **Nutrition Tracking** | Meals, macros, water intake; daily calorie/macro goals derived from TDEE |
| 🏆 **Gamification** | XP, named level tiers (Rookie → Legend), 6 unlockable badges, current/longest streaks |
| 💬 **Real-Time AI Coach** | **WebSocket streaming chat** (Groq **Llama 3.3**) with live context from your plan/recovery/mood |
| 🔔 **Notifications** | Live over WebSocket **or** stored offline and delivered on reconnect; per-type preferences |
| 👥 **Friends & Leaderboard** | Requests, accept/decline, nudges, and a **weekly-XP leaderboard** |
| 📊 **Dashboard Analytics** | 6 Recharts-ready endpoints — mood, weight, workout rate, weekly XP, recovery trends |
| 📝 **Weekly AI Reports** | Scheduled (Sun 9 PM) **Gemini** recap of the week + data-driven highlight |
| ⚙️ **Settings** | Edit profile, toggle each notification type, change password, delete account |

## 🛠️ Tech Stack

**Frontend** — React 19 · TypeScript · Vite · MUI v6 + Emotion · Zustand · TanStack Query · React Router 7 · Recharts · Framer Motion · Axios · react-hot-toast

**Backend** — FastAPI · Python 3.12 · MongoDB (Motor async) · Pydantic v2 · native WebSockets · APScheduler · python-jose (JWT) · bcrypt · boto3 (R2) · pytest

**AI** — Google **Gemini** (`google-genai`) for plans, mood analysis & reports · **Groq** for Llama 3.3 streaming chat and Whisper transcription

**Infra** — Docker · **Render** (backend) · **Vercel** (frontend) · MongoDB **Atlas** · Cloudflare **R2**

## 🏗️ Architecture

```
                          ┌──────────────────────────┐
   Browser (Vercel)  ◀──▶ │  React 19 + TypeScript    │
                          │  MUI · Zustand · Recharts │
                          └────────────┬─────────────┘
                             REST + WebSocket (wss)
                          ┌────────────▼─────────────┐
                          │  FastAPI  (Render/Docker) │
   middleware ─────────▶  │  rate-limit · logging ·   │
                          │  global error envelope    │
                          │  endpoints → services →   │
                          │  models  (+ WS manager)   │
                          └───┬────────┬────────┬─────┘
                     Motor    │        │        │  soft-imported, optional
                  ┌───────────▼──┐  ┌──▼───┐ ┌──▼───────────────┐
                  │ MongoDB Atlas│  │ Groq │ │ Gemini · R2 ·    │
                  │ (10 indexes) │  │Whisper│ │ APScheduler jobs │
                  └──────────────┘  │+Llama│ └──────────────────┘
                                    └──────┘
```

**Design principles**
- **Layered:** every domain is `endpoint → service → model`; models own persistence, services own logic.
- **Graceful degradation:** no MongoDB → in-memory store; no AI key → deterministic fallback; no R2 → skip upload. The app never hard-crashes on a missing dependency.
- **Consistent contract:** every response (success *and* error) is `{ success, message, data }`.

## 📁 Repository structure

```
fitmind-ai/
├── backend/           # FastAPI app (see backend/README.md)
│   ├── app/
│   │   ├── api/v1/     # routers + WebSocket endpoint
│   │   ├── services/   # business logic (auth, workout, gamification, …)
│   │   ├── models/     # persistence (Mongo + in-memory fallback)
│   │   ├── middleware/ # error handlers, rate limit, request logging
│   │   ├── websockets/ # connection manager + handlers
│   │   └── background_jobs/  # APScheduler jobs
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/          # React + Vite app (see frontend/README.md)
│   └── src/{components,services,hooks,store,constants,types}
├── render.yaml        # Render Blueprint (backend)
└── README.md          # you are here
```

## ⚡ Quick start

```bash
# 1) Backend  (Terminal 1)
cd backend
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env.local                         # fill in values (see below)
uvicorn app.main:app --reload                      # http://localhost:8000/docs

# 2) Frontend (Terminal 2)
cd frontend
npm install
npm run dev                                        # http://localhost:5173
```

Runs **out of the box with zero keys** — it falls back to an in-memory store and deterministic AI stubs. Add keys to unlock real persistence and AI.

## 🔑 Environment variables (backend `.env.local`)

| Variable | Required | Purpose |
|---|---|---|
| `MONGODB_URL` | for persistence | Mongo connection (local or Atlas SRV) |
| `JWT_SECRET` | ✅ | Signs auth tokens |
| `DATABASE_ENV` | ✅ | `local` or `production` (controls CORS strictness) |
| `GROQ_API_KEY` | for AI | Whisper transcription + Llama 3.3 chat |
| `GEMINI_API_KEY` | for AI | Plans, mood analysis, weekly reports |
| `CLOUDFLARE_R2_*` | optional | Voice-audio storage (access key/secret/bucket/url) |
| `CORS_EXTRA_ORIGINS` | production | Comma-separated allowed frontend origins |

Frontend uses a single var: `VITE_API_BASE_URL` (defaults to `http://localhost:8000`).

## 🚢 Deployment

- **Backend → Render:** one-click via [`render.yaml`](render.yaml) (Docker web service). Set the secret env vars in the dashboard and add `0.0.0.0/0` to Atlas Network Access.
- **Frontend → Vercel:** root directory `frontend`, set `VITE_API_BASE_URL` to the backend URL, then add the Vercel origin to the backend's `CORS_EXTRA_ORIGINS`.

Full steps in [`backend/README.md`](backend/README.md) and [`frontend/README.md`](frontend/README.md).

## 📖 API

52 REST endpoints + a WebSocket channel, fully documented via **interactive Swagger UI** at [`/docs`](https://fitmind-backend-vr5y.onrender.com/docs). A grouped reference lives in [`docs/API.md`](docs/API.md).

## 🧪 Testing

```bash
cd backend && pytest        # backend test suite
cd frontend && npm run build  # typecheck + production build
```

## 📸 Screenshots

> _Add screenshots/GIFs to `docs/` and embed them here — dashboard, voice check-in, AI coach, leaderboard._

## 📄 License

[MIT](LICENSE) © Dhruv Sharma
