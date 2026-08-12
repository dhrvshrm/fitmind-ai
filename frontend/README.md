# FitMind AI — Frontend

React 19 + TypeScript SPA for FitMind AI — the dashboard, AI coach chat, voice check-in, workout planner, nutrition tracker, gamification, friends/leaderboard, reports, and settings.

<p>
  <img alt="React" src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white" />
  <img alt="Vite" src="https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white" />
  <img alt="MUI" src="https://img.shields.io/badge/MUI-007FFF?logo=mui&logoColor=white" />
</p>

**Live:** [fitmind-ai-lyart.vercel.app](https://fitmind-ai-lyart.vercel.app)

## Stack

React 19 · TypeScript · Vite · MUI v6 + Emotion · Zustand (auth/UI state) · TanStack Query · React Router 7 · Recharts (analytics) · Framer Motion (page transitions) · Axios · react-hot-toast.

## Conventions

- **`type` over `interface`**, colocated **`*.styles.ts`** for MUI `sx` objects, and **no hardcoded UI strings** — all copy lives in `src/constants/strings.ts`.
- Layered: **`services` (API) → `hooks`/`store` → `components`**. Every API call unwraps the backend `{ success, message, data }` envelope.
- A global **ErrorBoundary** catches render crashes; **react-hot-toast** surfaces API errors via `resolveApiError`.

```
src/
├── components/   # per-feature UI (dashboard, coach, workout, profile, …)
├── services/     # typed API clients (authService, workoutService, …)
├── hooks/        # useAuth, useWebSocket, useNotifications, …
├── store/        # Zustand stores (auth, ui)
├── constants/    # api endpoints, routes, strings, navigation
├── types/        # shared domain types
└── theme.ts      # MUI theme (Sora/Inter, aurora palette)
```

## Run locally

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
```

Point it at a backend with an env var (optional — defaults to `http://localhost:8000`):

```bash
# frontend/.env.local
VITE_API_BASE_URL=http://localhost:8000
```

## Scripts

```bash
npm run dev        # dev server (HMR)
npm run build      # typecheck (tsc -b) + production build
npm run preview    # preview the production build
npm run lint       # eslint
```

## Environment variables

| Variable | Purpose |
|---|---|
| `VITE_API_BASE_URL` | Backend base URL. The WebSocket URL is derived from it (http→ws / https→wss). |

## Feature checklist ✅

- [x] Email/password auth, protected routes, persisted session (Zustand)
- [x] Multi-step onboarding (age, goal, experience, equipment, injuries)
- [x] Dashboard with 6 Recharts visualizations + stat tiles
- [x] AI Coach — streaming chat over WebSocket
- [x] Voice check-in — record → transcript + mood/energy
- [x] Recovery logger with score + recommendation
- [x] AI workout planner — weekly plan, today's session, logging, completion
- [x] Nutrition — meals, macros, water, calorie goals
- [x] Gamification — XP bar, level tiers, badge wall, streaks
- [x] Notifications — live bell over WebSocket + offline delivery
- [x] Friends — search, requests, accept/decline, nudges
- [x] Weekly leaderboard (friends by weekly XP)
- [x] Weekly AI reports
- [x] Profile + Settings (edit profile, notification toggles, change password, delete account)
- [x] Loading skeletons, empty states, error toasts, page transitions, error boundary
- [x] Responsive (MUI breakpoints), branded aurora theme (Sora + Inter)

## Deploy to Vercel

1. Vercel → **Add New → Project** → import the repo.
2. **Root Directory:** `frontend` (framework auto-detected as Vite).
3. Env var: `VITE_API_BASE_URL = https://<your-backend>.onrender.com`.
4. Deploy → add the resulting Vercel origin to the backend's `CORS_EXTRA_ORIGINS`.

SPA routing is handled by [`vercel.json`](vercel.json) (rewrites all paths to `index.html`).
