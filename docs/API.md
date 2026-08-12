# FitMind AI — API Reference

Base URL (local): `http://localhost:8000` · Base URL (prod): `https://fitmind-backend-vr5y.onrender.com`
All REST routes are under `/api/v1`. Interactive docs: **[/docs](https://fitmind-backend-vr5y.onrender.com/docs)** (Swagger) and `/redoc`.

## Response envelope

Every response — success **and** error — uses:

```json
{ "success": true, "message": "Human-readable message", "data": { } }
```

On error, `success` is `false`, `message` explains it, and `data` is `null` (or `{ "errors": [...] }` for validation). Status codes: `400` bad request, `401` unauthorized, `404` not found, `422` validation, `429` rate limited, `500` server error.

## Authentication

1. `POST /api/v1/auth/register` → `POST /api/v1/auth/login` returns `{ "data": { "token": "<jwt>" } }`.
2. Send it on protected routes: `Authorization: Bearer <token>`.

```bash
# Register + login
curl -X POST $BASE/api/v1/auth/register -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"secret123"}'

TOKEN=$(curl -s -X POST $BASE/api/v1/auth/login -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"secret123"}' | jq -r .data.token)

# Call a protected route
curl $BASE/api/v1/auth/me -H "Authorization: Bearer $TOKEN"
```

## Rate limiting

100 requests / 60 s per IP (configurable). Exceeding it returns `429` with a `Retry-After` header.

---

## Endpoints by domain

### Auth
| Method | Path | Body | Notes |
|---|---|---|---|
| POST | `/auth/register` | `{email, password}` | 201; returns `{user_id, email}` |
| POST | `/auth/login` | `{email, password}` | returns `{token}` |
| GET | `/auth/me` | — | 🔒 current user |
| POST | `/auth/logout` | — | 🔒 stateless (client drops token) |

### Onboarding & profile
| Method | Path | Body |
|---|---|---|
| POST | `/users/onboarding` | `{age, gender, weight_kg, height_cm, fitness_goal, experience_level, available_equipment}` → `{bmi, tdee, profile_created}` |
| GET | `/users/profile` | 🔒 full profile |
| PUT | `/users/profile` | 🔒 partial update |

### Recovery
| Method | Path | Body |
|---|---|---|
| POST | `/recovery/log` | `{sleep_hours, sleep_quality, stress_level, muscle_soreness}` → `{recovery_score, recommendation}` |
| GET | `/recovery/score/today` | 🔒 `{score, recommendation, explanation}` |
| GET | `/recovery/history` | 🔒 `?days=14` |

**Score formula:** `(sleep_hours×10) + (sleep_quality×10) + ((5−stress)×10) + ((5−soreness)×5)`, clamped 0–100.

### Voice check-in
| Method | Path | Body |
|---|---|---|
| POST | `/checkin/voice` | 🔒 multipart `audio` file → `{transcript, mood, energy_level, timestamp}` |
| GET | `/checkin/history` | 🔒 `?limit=30` |

Pipeline: R2 upload → Groq Whisper transcription → Gemini mood/energy analysis (with keyword-heuristic fallback).

### Workouts
| Method | Path | Body |
|---|---|---|
| POST | `/workouts/generate` | 🔒 `{fitness_goal?, experience_level?, available_equipment?}` — adapts to recovery + mood |
| GET | `/workouts/plan/week` | 🔒 current weekly plan |
| GET | `/workouts/plan/today` | 🔒 today's exercises |
| POST | `/workouts/log` | 🔒 `{exercises, duration_minutes, intensity}` → `{xp_earned, new_level, new_badges}` |
| GET | `/workouts/history` | 🔒 `?days=30` |
| PUT | `/workouts/exercise/complete` | 🔒 `{exercise_name}` |

### Nutrition
| Method | Path | Body |
|---|---|---|
| POST | `/nutrition/meal` | 🔒 `{name, calories, protein, carbs, fats}` → +XP |
| GET | `/nutrition/today` | 🔒 totals, goals, macro %, water |
| GET | `/nutrition/history` | 🔒 per-day totals |
| POST | `/nutrition/water` | 🔒 `{amount_ml}` |

### Gamification
| Method | Path | Notes |
|---|---|---|
| GET | `/gamification/profile` | 🔒 xp, level, title, streaks, badges |
| POST | `/gamification/xp` | 🔒 `{amount}` |
| GET | `/gamification/badges` | 🔒 earned + full catalog |

### Dashboard analytics (Recharts-ready)
`GET /dashboard/{summary, mood-performance, weight-trend, workout-rate, xp-weekly, recovery-trend}` — each 🔒 returns `{ data: [...], summary: {...} }`.

### Notifications
| Method | Path |
|---|---|
| GET | `/notifications` 🔒 |
| POST | `/notifications/{id}/read` 🔒 |

### Friends & leaderboard
| Method | Path | Body |
|---|---|---|
| POST | `/friends/request` | 🔒 `{to_user_id?}` or `{to_username?}` |
| PUT | `/friends/accept/{request_id}` | 🔒 |
| PUT | `/friends/decline/{request_id}` | 🔒 |
| GET | `/friends/list` | 🔒 |
| GET | `/friends/requests` | 🔒 pending incoming |
| POST | `/friends/nudge/{user_id}` | 🔒 friends only |
| GET | `/friends/{username}` | 🔒 search + friendship status |
| GET | `/leaderboard/weekly` | 🔒 ranked by weekly XP |

### Reports
| Method | Path |
|---|---|
| GET | `/reports/history` 🔒 |
| GET | `/reports/latest` 🔒 |
| GET | `/reports/{report_id}` 🔒 |
| POST | `/reports/generate` 🔒 on-demand |

### Settings
| Method | Path | Body |
|---|---|---|
| GET | `/settings/profile` | 🔒 |
| PUT | `/settings/profile` | 🔒 `{username?, age?, weight_kg?, height_cm?, fitness_goal?}` |
| PUT | `/settings/goals` | 🔒 `{fitness_goal?, experience_level?, available_equipment?}` |
| PUT | `/settings/preferences` | 🔒 per-type notification toggles |
| PUT | `/settings/password` | 🔒 `{current_password, new_password}` |
| DELETE | `/settings/account` | 🔒 |

### WebSocket
`ws(s)://<host>/ws/{user_id}` — send `{type:"message", content:"..."}`; receive `{type:"start"}` → `{type:"token", content}` … → `{type:"done"}`. Also pushes `{type:"notification", data}` live and on reconnect.

🔒 = requires `Authorization: Bearer <token>`.
