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
| POST | `/workouts/generate` | (auth) `{fitness_goal?, experience_level?, available_equipment?}` (default to the profile). Builds the week by rules from the curated exercise catalogue; no AI. Each new plan rotates exercise choices |
| GET | `/workouts/plan/week` | (auth) `{plan: {week, meta}}`; `meta` has the guideline basis, level, days per week, weekly sets per muscle and notes |
| GET | `/workouts/plan/today` | (auth) today's session: a quick session if one was chosen, else the plan's day adjusted for today's recovery score (`mode`: normal, light with one set fewer, or rest with mobility instead) |
| POST | `/workouts/quick` | (auth) `{minutes: 10, 15 or 20, place: home or gym}` replaces today's session with a circuit |
| DELETE | `/workouts/quick` | (auth) back to today's planned session |
| GET | `/workouts/plan/{day}/exercises/{index}/alternatives` | (auth) same-pattern exercises allowed for the user's equipment, injuries and level |
| POST | `/workouts/plan/{day}/exercises/{index}/swap` | (auth) `{exercise_id}`; 400 if it isn't an allowed alternative |
| POST | `/workouts/log` | (auth) `{exercises, duration_minutes, intensity}` -> `{xp_earned, new_level, new_badges}` |
| GET | `/workouts/history` | (auth) `?days=30` |
| PUT | `/workouts/exercise/complete` | (auth) `{exercise_name}` |

Plan exercises carry `exercise_id`, `pattern`, `primary_muscles`, `secondary_muscles`, `equipment`, `image` and `effort` alongside `name`, `sets`, `reps`, `rest` and `difficulty`.

### Exercise library
| Method | Path | Body |
|---|---|---|
| GET | `/exercises?q=&muscle=&equipment=&curated=` | (auth) search; curated exercises first |
| GET | `/exercises/{id}` | (auth) photos, force type, mechanic, level, equipment, primary, secondary and stabiliser muscles; for curated exercises also grip, stance, steps, cues, mistakes, breathing, and easier and harder variations |

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

### Activity and desk life (Phase 11)
Steps are entered by hand (one value per user-local date, editable). When at least 7 of the last 14 days have steps, the activity level behind the calorie targets follows the average steps (bands: under 5,000 sedentary, 5,000 light, 7,500 moderate, 10,000 active, 12,500 very active), limited to one band from the self-reported level and one band per change; calorie floors still apply. Automatic sync (Health Connect) is a later step.

| Method | Path | Body / notes |
|---|---|---|
| GET | `/activity/steps?days=14` | (auth) `{today, today_steps, target, target_is_default, days:[{date, steps|null}], average_7d, days_on_target, max_backfill_days, activity:{self_reported, step_level, effective, source:"steps"|"self_reported", recent_days_logged, recent_average, days_needed, window_days}}`. `days` 1 to 90. |
| PUT | `/activity/steps/{YYYY-MM-DD}` | (auth) `{steps}` 0 to 100,000; today or up to 30 days back. Returns `{entry, summary}`. May recompute targets. |
| DELETE | `/activity/steps/{YYYY-MM-DD}` | (auth) 404 if nothing logged that day. Returns `{summary}`. |
| GET | `/activity/settings` | (auth) `{step_target|null, default_step_target, effective_step_target, break_reminders_enabled, work_start, work_end, break_interval_minutes, work_days}` (`work_days`: Monday = 0). |
| PUT | `/activity/settings` | (auth) partial: `{step_target?, reset_step_target?, break_reminders_enabled?, work_start?, work_end?, break_interval_minutes? (15-240), work_days?}` |
| GET | `/activity/desk-routines` | (auth) `{routines:[{id, name, description, minutes, focus, total_seconds, skipped_for_injury, steps:[{exercise_id, name, seconds, per_side, image, images, cue, joints}]}]}`. Moves that load an injured joint are left out. Exercise details come from `/exercises/{exercise_id}`. |
| GET | `/activity/desk-routines/{id}` | (auth) one routine; 404 if unknown. |

Break reminders for push: `app.services.activity_service.due_break_reminders(user, now)` returns `[{type:"break_reminder", key, title, body, routine_id, slot_at, url}]` (empty when none is due, reminders are off, or the slot is over 20 minutes old). Call `mark_break_reminder_sent(user_id, key)` after sending.

### Barcode and photo logging
Neither endpoint saves a meal: both return something to review, then log with `POST /nutrition/meal`. Errors use the envelope with `data: {code}`.

| Method | Path | Body / notes |
|---|---|---|
| GET | `/nutrition/barcode/{code}` | (auth) Open Food Facts lookup (cached 30 days, misses 1 day). `{barcode, name, brand, image, per_100g:{kcal, protein, carbs, fat, fiber}|null, has_nutrition, serving_options:[{id:"100g"|"serving"|"pack", label, grams}], default_serving, source:"open_food_facts", source_name, source_url}`. 400 `invalid_barcode`, 404 `not_found`, 503 `lookup_unavailable`. Log items with `source: "open_food_facts"`. |
| POST | `/nutrition/photo-estimate` | (auth) multipart `image` (JPEG, PNG, WebP or HEIC, up to 6 MB). Gemini names the dishes and rough portions; numbers come from the food database through the normal estimate pipeline. Same shape as `POST /nutrition/estimate`, every amount marked assumed. The photo is not stored. 400 `empty_image`/`image_too_large`/`unsupported_image`, 422 `no_food`, 503 `ai_quota`/`ai_unavailable`/`ai_not_configured`. |

### Coach (Phase 9)
Conversations, messages and confirm cards are stored server-side (`coach_conversations`, `coach_messages`, `coach_proposals`; up to 200 messages and 10 chats per user, oldest dropped first). Read tools run at once; action tools only create a pending proposal, and run when the user confirms. Confirmation text and numbers come from the backend result, never the model.

| Method | Path | Body / notes |
|---|---|---|
| GET | `/coach/conversation` | (auth) `{conversation_id|null, messages:[{id, role, kind:"text"|"menu"|"action_result", content, proposals:[Proposal], created_at}]}`, last 60 messages, oldest first. |
| POST | `/coach/conversation` | (auth) start a new chat. `{conversation_id, messages: []}`. |
| DELETE | `/coach/history` | (auth) delete every coach conversation, message and proposal. |
| POST | `/coach/messages` | (auth) `{content}` (1 to 6000 chars). Non-streaming version of the socket chat. `{conversation_id, user_message_id, message_id, content, proposals:[Proposal]}`. |
| POST | `/coach/actions/{id}/confirm` | (auth) run a pending proposal from its stored payload. `{proposal, message (stored confirmation), invalidate:[domain], data}`. `proposal.status` is `done` or `failed` (the reason is in `message.content`). 404 unknown or someone else's, 409 already handled or expired (2 hours). Also pushes `{"type":"invalidate","domains"}` on the socket. |
| POST | `/coach/actions/{id}/cancel` | (auth) dismiss a pending proposal. `{proposal}`. 404/409 as above. |
| POST | `/coach/menu` | (auth) multipart: `text` (pasted or typed menu) and/or `image` (JPEG, PNG, WebP or HEIC up to 6 MB, read with Gemini vision). Best 2-3 picks for what's left today. `{conversation_id, user_message, message (with one log_meal proposal per pick), options:[{name, portion, why, kcal, protein, carbs, fat, estimate:true, fits}]}`. Numbers come from the estimate pipeline and are labelled estimates. 400 no menu / unreadable photo / nothing estimable, 429 AI quota. Without AI, menu lines are estimated and ranked by protein per calorie. |

`Proposal`: `{id, tool, title, summary, changes:[{label, value}], estimate, status:"pending"|"executing"|"done"|"failed"|"cancelled"|"expired", result_message|null, invalidates:[domain], created_at}`. Domains: `nutrition`, `dietPlan`, `workouts`, `recovery`, `dashboard`, `gamification`.

Tools: read `get_nutrition_today`, `get_meal_plan`, `get_today_workout`, `get_recovery`, `get_weight_trend`, `suggest_from_menu`; action `log_meal` (text through the estimate pipeline), `log_water`, `regenerate_plan_meal`, `swap_plan_food`, `start_quick_workout`, `log_recovery`. Register more in `app/coach/registry.py`.

Socket (`/ws`): `{"type":"message","content"}` now answers with `start` (`user_message_id`), `token` frames, then `done` with `{content, message_id, conversation_id, proposals}`. Model choice: `COACH_PROVIDERS`, `COACH_GEMINI_MODEL`, `COACH_GROQ_MODEL` (picked with `scripts/eval_coach_tools.py`).
