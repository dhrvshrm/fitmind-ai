# FitMind AI - AI-Powered Fitness Coach

A full-stack SaaS platform combining AI, real-time notifications, and gamification for personalized fitness coaching.

## Key Features

- **Voice-First Mood Detection** - Record voice, AI detects mood & energy
- **Recovery Intelligence** - AI recommends rest/light/hard training
- **Real-time AI Coach** - WebSocket streaming chat coach
- **Smart Dashboards** - Real-time analytics & insights
- **Nutrition Tracker** - Log meals, auto-track macros
- **AI Workout Planner** - Gemini generates weekly plans
- **Gamification** - XP, streaks, badges, leaderboards
- **Real-time Notifications** - WebSocket-powered

## Tech Stack

**Frontend**: React 18 + TypeScript + MUI + Zustand + Vercel
**Backend**: FastAPI + Python + MongoDB + Render
**AI**: Gemini + Groq (Llama 3 + Whisper)
**Real-time**: WebSocket
**Auth**: Supabase

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
## License

MIT - Portfolio Project

