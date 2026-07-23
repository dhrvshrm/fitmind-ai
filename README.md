# FitMind AI - AI-Powered Fitness Coach

A full-stack SaaS platform combining AI, real-time communication, and gamification for personalized fitness coaching.

## Completed Features

- **Authentication** - Email/password auth via Supabase, protected routes, multi-step onboarding flow
- **Dashboard** - Real-time analytics and insights summarizing workouts, recovery, and nutrition
- **AI Coach** - WebSocket streaming chat coach powered by Groq (Llama 3), with a Gemini fallback
- **Workout Planner** - Gemini-generated weekly workout plans, exercise logging, workout history and completion tracking
- **Recovery Intelligence** - Daily recovery logging with an AI-driven rest/light/hard training recommendation
- **Voice Check-In** - Record voice notes; Groq Whisper transcribes and Gemini detects mood and energy level
- **Nutrition Tracker** - Meal logging with automatic macro tracking, calorie progress, and water intake tracking
- **Gamification** - XP, levels, streaks, and a badge wall
- **Notifications** - Real-time in-app notifications delivered over WebSocket, plus offline/pending delivery on reconnect, backed by a scheduled background job (e.g. streak-warning alerts)

Friends, Profile, and Settings pages exist as placeholders ("Coming Soon") and are not yet implemented.

## Tech Stack

**Frontend**
- React 19 + TypeScript
- Vite
- MUI (Material UI) for components, Emotion for styling
- Zustand for state management
- TanStack Query for data fetching/caching
- React Router for routing
- Axios for HTTP
- Framer Motion for animation
- Recharts for charts
- react-hot-toast for notifications UI

**Backend**
- FastAPI (Python)
- MongoDB via Motor/PyMongo
- Pydantic / pydantic-settings for schemas and config
- Native WebSockets for real-time chat and notifications
- APScheduler for background/cron jobs
- python-jose + bcrypt for token/password handling
- boto3 (cloud storage integration)
- pytest / pytest-asyncio for testing

**AI**
- Google Gemini - workout plan generation, mood/energy analysis, chat fallback
- Groq - Llama 3 (streaming chat), Whisper (voice transcription)

**Auth**
- Supabase

**Deployment (intended)**
- Frontend: Vercel
- Backend: Render

## Quick Start

```bash
# Frontend (Terminal 1)
cd frontend && npm install && npm run dev

# Backend (Terminal 2)
cd backend && python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload

# Open http://localhost:5173
```

Backend environment variables are documented in `backend/.env.example` (MongoDB URL, Supabase credentials, Groq/Gemini API keys, JWT secret).

## License

MIT - Portfolio Project
