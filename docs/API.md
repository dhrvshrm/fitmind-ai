# FitMind AI - API Reference

Base URL (local): `http://localhost:8000`, Base URL (prod): `https://fitmind-backend-vr5y.onrender.com`
All REST routes are under `/api/v1`. Interactive docs: **[/docs](https://fitmind-backend-vr5y.onrender.com/docs)** (Swagger) and `/redoc`.

## Response envelope

Every response - success **and** error - uses:

```json
{ "success": true, "message": "Human-readable message", "data": { } }
```

On error, `success` is `false`, `message` explains it, and `data` is `null` (or `{ "errors": [...] }` for validation). Status codes: `400` bad request, `401` unauthorized, `404` not found, `422` validation, `429` rate limited, `500` server error.

## Authentication

1. `POST /api/v1/auth/register` -> `POST /api/v1/auth/login` returns `{ "data": { "token": "<jwt>" } }`.
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
| GET | `/auth/me` | - | (auth) current user |
| POST | `/auth/logout` | - | (auth) stateless (client drops token) |

### Onboarding & profile
| Method | Path | Body |
|---|---|---|
| POST | `/users/onboarding` | `{age, gender, weight_kg, height_cm, fitness_goal, experience_level, available_equipment}` -> `{bmi, tdee, profile_created}` |
| GET | `/users/profile` | (auth) full profile |
| PUT | `/users/profile` | (auth) partial update |

### Recovery
| Method | Path | Body |
|---|---|---|
| POST | `/recovery/log` | `{sleep_hours, sleep_quality, stress_level, muscle_soreness}` -> `{recovery_score, recommendation}` |
| GET | `/recovery/score/today` | (auth) `{score, recommendation, explanation}` |
| GET | `/recovery/history` | (auth) `?days=14` |

**Score formula:** `(sleep_hoursx10) + (sleep_qualityx10) + ((5-stress)x10) + ((5-soreness)x5)`, clamped 0-100.

### Voice check-in
| Method | Path | Body |
|---|---|---|
| POST | `/checkin/voice` | (auth) multipart `audio` file -> `{transcript, mood, energy_level, timestamp}` |
| GET | `/checkin/history` | (auth) `?limit=30` |

Pipeline: R2 upload -> Groq Whisper transcription -> Gemini mood/energy analysis (with keyword-heuristic fallback).

### Workouts
| Method | Path | Body |
|---|---|---|
| POST | `/workouts/generate` | (auth) `{fitness_goal?, experience_level?, available_equipment?}` - adapts to recovery + mood |
| GET | `/workouts/plan/week` | (auth) current weekly plan |
| GET | `/workouts/plan/today` | (auth) today's exercises |
| POST | `/workouts/log` | (auth) `{exercises, duration_minutes, intensity}` -> `{xp_earned, new_level, new_badges}` |
| GET | `/workouts/history` | (auth) `?days=30` |
| PUT | `/workouts/exercise/complete` | (auth) `{exercise_name}` |

### Nutrition
| Method | Path | Body |
|---|---|---|
| POST | `/nutrition/meal` | (auth) `{name, calories, protein, carbs, fats}` -> +XP |
| GET | `/nutrition/today` | (auth) totals, goals, macro %, water |
| GET | `/nutrition/history` | (auth) per-day totals |
| POST | `/nutrition/water` | (auth) `{amount_ml}` |

### Gamification
| Method | Path | Notes |
|---|---|---|
| GET | `/gamification/profile` | (auth) xp, level, title, streaks, badges |
| POST | `/gamification/xp` | (auth) `{amount}` |
| GET | `/gamification/badges` | (auth) earned + full catalog |

### Dashboard analytics (Recharts-ready)
`GET /dashboard/{summary, mood-performance, weight-trend, workout-rate, xp-weekly, recovery-trend}` - each (auth) returns `{ data: [...], summary: {...} }`.

### Notifications
| Method | Path |
|---|---|
| GET | `/notifications` (auth) |
| POST | `/notifications/{id}/read` (auth) |

### Friends & leaderboard
| Method | Path | Body |
|---|---|---|
| POST | `/friends/request` | (auth) `{to_user_id?}` or `{to_username?}` |
| PUT | `/friends/accept/{request_id}` | (auth) |
| PUT | `/friends/decline/{request_id}` | (auth) |
| GET | `/friends/list` | (auth) |
| GET | `/friends/requests` | (auth) pending incoming |
| POST | `/friends/nudge/{user_id}` | (auth) friends only |
| GET | `/friends/{username}` | (auth) search + friendship status |
| GET | `/leaderboard/weekly` | (auth) ranked by weekly XP |

### Reports
| Method | Path |
|---|---|
| GET | `/reports/history` (auth) |
| GET | `/reports/latest` (auth) |
| GET | `/reports/{report_id}` (auth) |
| POST | `/reports/generate` (auth) on-demand |

### Settings
| Method | Path | Body |
|---|---|---|
| GET | `/settings/profile` | (auth) |
| PUT | `/settings/profile` | (auth) `{username?, age?, weight_kg?, height_cm?, fitness_goal?}` |
| PUT | `/settings/goals` | (auth) `{fitness_goal?, experience_level?, available_equipment?}` |
| PUT | `/settings/preferences` | (auth) per-type notification toggles |
| PUT | `/settings/password` | (auth) `{current_password, new_password}` |
| DELETE | `/settings/account` | (auth) |

### WebSocket
`ws(s)://<host>/ws/{user_id}` - send `{type:"message", content:"..."}`; receive `{type:"start"}` -> `{type:"token", content}` ... -> `{type:"done"}`. Also pushes `{type:"notification", data}` live and on reconnect.

(auth) = requires `Authorization: Bearer <token>`.
