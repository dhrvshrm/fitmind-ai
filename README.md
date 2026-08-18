# FitMind AI

FitMind AI is a full-stack fitness coaching app. You record a short voice note about how you're feeling; it gets transcribed and analysed for mood and energy, and that (together with a daily recovery score) is used to generate a workout plan that matches your readiness. On top of that it has a real-time AI chat coach, nutrition tracking, gamification, friends and a weekly leaderboard, and an automated weekly summary.

I built it end to end - the FastAPI backend, the React frontend, the AI integrations, and the deployment.

<p>
  <img alt="React" src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white" />
  <img alt="FastAPI" src="https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white" />
  <img alt="Python" src="https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white" />
  <img alt="MongoDB" src="https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=white" />
  <img alt="MUI" src="https://img.shields.io/badge/MUI-6-007FFF?logo=mui&logoColor=white" />
  <img alt="Docker" src="https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white" />
  <img alt="License" src="https://img.shields.io/badge/License-MIT-yellow" />
</p>

- Live app: https://fitmind-ai-lyart.vercel.app
- API docs: https://fitmind-backend-vr5y.onrender.com/docs
- Demo video: _to add_

Note: the backend is on Render's free tier and sleeps after about 15 minutes of inactivity, so the first request can take 30 to 60 seconds while it wakes up.

## What it does

- Auth and onboarding. Email/password login with JWT, a multi-step onboarding flow, and BMI/TDEE calculated from your profile.
- Voice check-in. Record audio, Groq Whisper transcribes it, and Gemini reads your mood and energy. Audio is stored in Cloudflare R2.
- Recovery scoring. Log sleep, stress and soreness to get a 0 to 100 recovery score with a rest / light / hard recommendation.
- AI workout planner. Gemini generates a 7-day plan that adapts to your recovery score and mood.
- Workout logging. Log sessions, mark exercises done, earn XP, and track streaks and completion rate.
- Nutrition tracking. Log meals, macros and water, with daily calorie and macro goals based on your TDEE.
- Gamification. XP, level tiers from Rookie up to Legend, unlockable badges, and streaks.
- Real-time AI coach. A streaming chat coach over WebSocket that answers with context from your plan, recovery and mood.
- Notifications. Delivered live over WebSocket, or stored and delivered when you reconnect, with per-type preferences.
- Friends and leaderboard. Requests, nudges, and a weekly-XP leaderboard.
- Dashboard analytics. Charts for mood, weight, workout rate, weekly XP and recovery trends.
- Weekly reports. A scheduled, AI-written recap of your week.
- Settings. Edit your profile, toggle notifications, change your password, or delete your account.

## Tech stack

Frontend: React 19, TypeScript, Vite, MUI with Emotion, Zustand, TanStack Query, React Router, Recharts, Framer Motion.

Backend: FastAPI, Python 3.12, MongoDB (Motor async driver), Pydantic, native WebSockets, APScheduler, JWT auth with bcrypt.

AI: Google Gemini for plans, mood analysis and reports. Groq for the streaming chat model and Whisper transcription.

Infrastructure: Docker, Render (backend), Vercel (frontend), MongoDB Atlas, Cloudflare R2.

## How it's built

The backend is layered per feature: an endpoint calls a service, and the service talks to a model. A design idea I leaned on throughout is graceful degradation, so the app still runs when something isn't configured: with no database it falls back to an in-memory store, with no AI key it returns sensible fallbacks instead of erroring, and with no object storage it simply skips the audio upload. Every response, success or error, uses the same shape: `{ success, message, data }`.

There are 52 REST endpoints plus a WebSocket channel for the streaming chat and live notifications, all documented with interactive Swagger UI at `/docs`.

## Repository

- `backend/` - FastAPI app
- `frontend/` - React + Vite app
- `docs/API.md` - grouped API reference

## License

MIT, see [LICENSE](LICENSE). Dhruv Sharma.
