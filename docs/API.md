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

1. `POST /api/v1/auth/register` -> `POST /api/v1/auth/login` returns `{ "data": { "token": "<jwt>" } }`. Emails are case-insensitive; passwords need at least 8 characters.
2. Send it on protected routes: `Authorization: Bearer <token>`.
3. Optionally send the browser's IANA timezone as `X-Timezone: Asia/Kolkata`. It decides the user's "today" for logs and plans and is saved to the profile. Without it, the stored timezone is used (default `Asia/Kolkata`).

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
| POST | `/users/onboarding` | `{age (13-100), gender (male/female/other), weight_kg (30-300), height_cm (100-250), fitness_goal, experience_level, available_equipment, injuries?, activity_level?, timezone?, goal_pace?, target_weight_kg?, body_fat_percent?, reproductive_status?, workout_days_per_week?, workout_time?, food_preferences?, food_access?, lifestyle?}` -> `{bmi, tdee, targets, profile_created}`. Safe to repeat to update answers. |
| GET | `/users/profile` | (auth) full profile, including answers and targets |
| PUT | `/users/profile` | (auth) partial update; recomputes targets |
| PUT | `/users/personalisation` | (auth) goal details and `food_preferences` / `food_access` / `lifestyle`; only sent fields change, recomputes targets |
| GET | `/users/targets` | (auth) daily targets with explanation notes and safety flags, or `null` until age, gender, height and weight are known |
| POST | `/users/targets/preview` | (auth) targets for unsaved answers; saves nothing |

`fitness_goal` is one of `fat_loss`, `muscle_gain`, `recomposition`, `maintain`, `general_fitness`, `athletic_performance`. Older ids (`lose_weight`, `build_muscle`, `improve_endurance`) are still accepted and mapped. Targets are computed by formula (`backend/app/nutrition/targets.py`): Mifflin-St Jeor or Katch-McArdle BMR, activity factor, a goal-based deficit or surplus capped at about 1% of body weight a week, no deficit under 18 or during pregnancy/breastfeeding, a 1,200/1,500 kcal floor, and protein by g/kg of body weight.

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
| POST | `/nutrition/estimate` | (auth) `{text}` e.g. "2 aloo parathas with curd" -> items with source (`INDB`, `USDA`, `custom`, `ai_estimate`, `unresolved`), grams, nutrients, per-100 g values and alternatives, plus totals. Saves nothing. |
| GET | `/nutrition/foods/search?q=` | (auth) user's own foods and dataset foods by name |
| GET | `/nutrition/foods/{id}` | (auth) one dataset food |
| POST | `/nutrition/meal` | (auth) `{name, calories, protein, carbs, fats, fiber?, meal_type?, eaten_at? "HH:MM", items?, log_date? (up to 7 days back)}` -> meal + XP |
| PUT | `/nutrition/meal/{id}` | (auth) partial edit; marks the meal edited; audited |
| DELETE | `/nutrition/meal/{id}` | (auth) audited |
| GET | `/nutrition/recent` | (auth) distinct meals from the last 30 days with `times_logged` |
| GET | `/nutrition/today` | (auth) totals (incl. fiber), goals, macro %, water, meals |
| GET | `/nutrition/history` | (auth) per-day totals |
| POST | `/nutrition/water` | (auth) `{amount_ml}` |
| GET / POST | `/nutrition/saved-meals` | (auth) list; create `{name, from_meal_id}` or `{name, items}` |
| POST | `/nutrition/saved-meals/{id}/log` | (auth) `{meal_type?, eaten_at?}` logs it for today |
| DELETE | `/nutrition/saved-meals/{id}` | (auth) |
| GET / POST | `/nutrition/my-foods` | (auth) custom foods: `{name, aliases?, serving_unit, serving_grams, calories, protein, carbs, fats, fiber}` per serving; matched before the datasets |
| DELETE | `/nutrition/my-foods/{id}` | (auth) |

Meals carry a `source`: `verified` (all foods from a dataset or the user's own foods), `estimated` (AI), `mixed`, or `manual`. See `docs/DATA_SOURCES.md` for where the numbers come from.

### Meal plans
| Method | Path | Body |
|---|---|---|
| GET | `/diet-plans/current` | (auth) the active plan, or `data: null`. Includes `logged_today` (meal ids) and `stale` (targets or diet answers changed since it was made) |
| POST | `/diet-plans` | (auth) create a plan, or replace the current one with different dishes. 400 until age, sex, height and weight are known; 503 when AI is unavailable |
| POST | `/diet-plans/current/meals/{meal_id}/regenerate` | (auth) a different option for one meal; the rest of the day is kept |
| GET | `/diet-plans/current/meals/{meal_id}/items/{index}/alternatives?q=` | (auth) allowed foods that could replace one item (same role, e.g. a grain for a grain), sized to about the same calories |
| POST | `/diet-plans/current/meals/{meal_id}/items/{index}/swap` | (auth) `{food_id}`; 400 if the food isn't allowed for the user |
| POST | `/diet-plans/current/meals/{meal_id}/log` | (auth) logs the planned meal for today -> meal, plan and XP; 400 if already logged today |

Meal ids are `breakfast`, `mid_morning`, `lunch`, `evening_snack`, `dinner` and `bedtime`, depending on meals per day. The AI only chooses dishes, by id, from foods the user's diet, allergies and exclusions allow; every number comes from the food database and portions are fitted to the targets in code. Each change is stored as a new version (`version`, `change`).

### Gamification
| Method | Path | Notes |
|---|---|---|
| GET | `/gamification/profile` | (auth) xp, level, title, streaks, badges |
| GET | `/gamification/badges` | (auth) earned + full catalog |

XP is awarded only by the server, for logged actions, with a daily cap per action: 1 workout, 1 recovery log, 1 voice check-in and 5 meals per local day. Logging more is allowed; it just earns 0 XP.

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
| DELETE | `/settings/account` | (auth) deletes the account and all of the user's data and stored files |

### WebSocket
`ws(s)://<host>/ws`. The first frame must be `{type:"auth", token:"<jwt>"}` within 10 seconds; the server answers `{type:"ready"}` or closes with code `4401`. Then send `{type:"message", content:"..."}` and receive `{type:"start"}` -> `{type:"token", content}` ... -> `{type:"done"}` on the same socket. `{type:"ping"}` gets `{type:"pong"}`. Notifications are pushed as `{type:"notification", data}` live and on reconnect.

(auth) = requires `Authorization: Bearer <token>`.
