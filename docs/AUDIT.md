# FitMind AI: Product and Technical Audit

Date: 2026-11-03
Scope: Phase 0 deliverable. No code was changed for this audit.

Constraints agreed for this plan:

- Personal project first, with a high demo quality bar. Real users come later, after a readiness phase.
- India-first: Indian foods, IST, INR budgets, ICMR-NIN guidance.
- Free services only. A different free model is allowed where tool calling needs it.

---

## 1. Summary

FitMind already has a solid base. The backend is FastAPI with clean endpoint, service and model layers. The frontend is React with a consistent component and styles convention. Gemini generates plans and reports, and Groq handles chat and Whisper transcription.

The vision in the brief is a personal nutritionist, coach and health assistant. Against that vision there are four structural gaps:

1. **Nutrition is shallow.** There is no diet plan feature. Meals are five manually typed numbers that cannot be edited or deleted. Macro targets are the same 30/40/30 split for every goal.
2. **The coach cannot act and does not remember.** Each chat message goes to the model alone, with no history, no tools and no nutrition context.
3. **Several security and correctness issues** must be fixed before any health data is stored. The most serious are an unauthenticated WebSocket, an endpoint that lets users self-award XP, and silent in-memory data loss in production.
4. **There are almost no tests** (2 in total). This makes every change risky.

The recommendation is to fix the foundation first, then build nutrition as the core. The action-taking coach should be built on top of the same services, followed by health, supplements and progress intelligence. Some requested items are deferred or changed:

- Supplement product discovery: not recommended now.
- Food photo logging: later.
- Free-form AI onboarding: replaced by a structured questionnaire with AI assistance.

---

## 2. Current Application Assessment

### 2.1 Architecture

| Area | Current state |
|---|---|
| Backend | FastAPI, Python 3.12. Layers are endpoint, service, model. Every response uses a `{success, message, data}` envelope. |
| Database | MongoDB through Motor. Hand-written model classes with UUID `id`s. Every model falls back to an in-memory dict when Mongo is unreachable. |
| Auth | bcrypt and HS256 JWT, valid for 7 days. Tokens cannot be refreshed or revoked. Optional Supabase sign-up, whose result is ignored. Token is stored in localStorage through a persisted zustand store. |
| AI | Gemini (`gemini-3.1-flash-lite`) for the workout plan, weekly report and mood analysis. Groq `openai/gpt-oss-20b` for streaming chat. Groq Whisper for transcription. |
| Realtime | WebSocket `/ws/{user_id}` for chat tokens and notifications. |
| Jobs | APScheduler in the same process as the API. Streak warning runs daily at 20:00; weekly report runs Sunday at 21:00, both in server time. |
| Storage | Cloudflare R2, used only for voice audio. URLs are built as public URLs. |
| Frontend | React 19, Vite, MUI, Emotion, zustand, axios, Recharts, Framer Motion. TanStack Query is installed but not used. |
| Deploy | Backend on Render (Docker, free plan). Frontend on Vercel. Database on MongoDB Atlas. |

Existing features include:

- Auth and 5-step onboarding.
- AI weekly workout plan, with logging and exercise completion.
- Recovery score.
- Voice mood check-in.
- Meal and water logging.
- XP, levels, badges and streaks.
- Friends, nudges and leaderboard.
- Notifications.
- Dashboard charts.
- Weekly AI reports.
- Settings and account deletion.

### 2.2 Strengths worth keeping

- Clear layering. New features can follow the same pattern.
- Graceful degradation when an AI provider is down. It needs tightening, but the principle is right.
- A consistent frontend convention: separate `.styles.ts` files, constants for strings, typed services.
- Gemini JSON mode is already used for plan generation.
- Gamification and the social layer are real differentiators for engagement and should stay.

### 2.3 Issues found

Severity: **High** blocks safe handling of health data or corrupts data. **Medium** degrades correctness or UX. **Low** is cleanup.

| # | Issue | Where | Severity |
|---|---|---|---|
| 1 | WebSocket has no authentication. Anyone with a user id can read that user's notifications and run chat on that user's context. | `backend/app/api/v1/websockets.py:14` | High |
| 2 | `POST /gamification/xp` lets the client award itself 1 to 1000 XP. | `backend/app/api/v1/endpoints/gamification.py:23` | High |
| 3 | Silent in-memory fallback in production. If Mongo is down, writes go to RAM and are lost on restart. | `backend/app/config/database.py`, every model | High |
| 4 | `User.update` writes the whole document with `$set`, so concurrent XP, badge or streak updates overwrite each other. | `backend/app/models/user.py:186` | High |
| 5 | Account deletion does not cascade. Child records and R2 audio are left behind. | `backend/app/services/auth_service.py` | High (once health data exists) |
| 6 | Insecure `JWT_SECRET` default, `DEBUG=True` by default, and CORS hardcodes localhost with credentials. | `backend/app/config/settings.py` | High in production |
| 7 | "Today" is decided by the server (UTC on Render). Meals logged between 00:00 and 05:30 IST land on the previous day. Cron jobs also run in UTC. | ~13 `date.today()` calls, `workout_service.py:163`, `jobs.py` | Medium |
| 8 | Injuries are collected in onboarding but silently dropped, because the backend schema has no injuries field. | `frontend/src/utils/onboarding.ts:83`, `backend/app/schemas/user.py` | Medium |
| 9 | No range validation in onboarding. `height_cm=0` causes a 500. Activity level is never collected, so TDEE always uses the 1.55 factor. | `schemas/user.py`, `utils/helpers.py` | Medium |
| 10 | Meals, workout logs, plans and weight logs have no update or delete. | `backend/app/models/*` | Medium |
| 11 | Macro goals are a fixed 30/40/30 split for every goal. | `services/nutrition_service.py:14` | Medium |
| 12 | Chat has no server history, no tools and no nutrition context. The persona asks for an "encouraging" tone, which produces the generic style the brief complains about. | `services/chat_service.py` | Medium |
| 13 | Synchronous Gemini, Whisper and boto3 calls inside async handlers block the event loop. | `ai_service.py:40`, `voice_service.py`, `cloud_service.py:58` | Medium |
| 14 | XP farming: workout logs are not deduplicated, recovery re-logs re-award XP, and every meal awards XP. | workout, recovery and nutrition services | Medium |
| 15 | Chat tokens fan out to every socket the user has open. Coach and notifications open separate sockets. | `websockets/handlers.py` | Medium |
| 16 | Session is cleared on any bootstrap error, including Render cold starts. | `frontend/src/hooks/useAuth.ts` | Medium |
| 17 | Stored `current_streak` goes stale, so streak warnings keep firing. | `background_jobs/jobs.py:31` | Low |
| 18 | `requirements.txt` is unpinned, and `render.yaml` is missing the R2 and model env vars. | `backend/requirements.txt`, `render.yaml` | Low |
| 19 | N+1 queries in the leaderboard and weekly XP, which fetch up to 500 days per friend. | `friend_service._weekly_xp`, `dashboard_service._xp_by_date` | Low (for now) |
| 20 | Only 2 backend tests and no frontend or E2E tests. | `backend/tests` | High (process) |

---

## 3. Competitor Research

| Product | What it does well | What we take from it | Where we can differentiate |
|---|---|---|---|
| **Healthify (HealthifyMe)** | India-first food database. Snap photo logging, tuned for Indian food. AI text search logging. Ria AI coach (GPT-4 based). Swiggy meal ordering. Paid human coaches. | Text-first logging of Indian dishes. A coach that knows your data. | Their AI coach mainly advises. Ours will act on confirmed requests, keep health data provenance, and be transparent about estimated versus verified values. |
| **MacroFactor** | Adaptive expenditure: works backward from intake and a smoothed weight trend to estimate true TDEE. Converges in about 2 to 4 weeks. Does not overreact to daily weight noise. | The adaptive TDEE approach, and the weight-trend smoothing. | No India focus, no health reports, no supplement layer. |
| **Cronometer** | Curated data from USDA FDC and NCCDB, reviewed by staff, with the source shown per food. Strong micronutrient tracking. | Show the data source on every value, and prefer curated data over user-entered data. | Weak on Indian dishes. |
| **MyFitnessPal** | Huge database (about 14M entries), mostly user-entered. | Shows the cost of unverified data: entries are noisy and inconsistent. | Accuracy and provenance over volume. |
| **Fitbod and similar** | Workout generation from available equipment and recovery, with exercise swaps. | Equipment-aware substitution. Keep the plan intact and swap one session. | Combined with nutrition and recovery in one coach. |

Takeaways:

1. Data quality is the moat, not the AI. Users trust trackers whose numbers are consistent.
2. Speed of logging decides retention. Text and recent or saved meals should make logging a 2 to 5 second action.
3. Adaptive targets based on real data beat static formulas after the first few weeks.
4. Nobody in the Indian market combines a health-report-aware nutrition plan, supplement safety checks and a coach that executes actions. That combination is the differentiator.

---

## 4. Free Data Sources and AI Services

### 4.1 Food composition data

| Source | Coverage | Access and license | Use |
|---|---|---|---|
| **INDB (Indian Nutrient Databank, 2024)** | 1,014 standard Indian recipes and 1,095 raw foods. Energy, protein, carbs, fat, fiber and micronutrients, per 100 g and per serving. | Excel files on GitHub (`lindsayjaacks/Indian-Nutrient-Databank-INDB-`). The paper is CC BY 4.0 and calls INDB open access. The repo has no license file, so attribution is required and terms should be confirmed before real-user launch. Some recipes come from food blogs. | Primary source for Indian dishes. Import into a `foods` collection. |
| **IFCT 2017 (ICMR-NIN)** | About 528 to 542 key Indian raw foods, measured. | The official tables are a book. Community MIT-licensed extracts exist (`ifct2017` packages). Licensing of the underlying data is unclear. | Raw-ingredient fallback. Use INDB's raw foods first and treat IFCT extracts as secondary. |
| **USDA FoodData Central** | Global raw and branded foods. | Public domain (CC0). Free API key, 1,000 requests per hour per IP. Attribution requested. | Fallback for non-Indian foods and ingredients. Cache results. |
| **Open Food Facts** | Packaged products with barcodes, about 4.5M worldwide. India coverage unknown and probably patchy. | ODbL. 100 product reads per minute and 10 searches per minute. Requires a custom User-Agent. | Barcode logging (later phase). |

### 4.2 AI services (free tiers)

| Service | Free tier (approximate; verify in console) | Strengths | Caveats |
|---|---|---|---|
| **Gemini API** (Flash and Flash-Lite) | Free quota on Flash models. Published limits are inconsistent; third-party guides cite about 15 RPM and 1,500 RPD for Flash. | JSON and structured output, function calling, native PDF and image input. Good for report extraction, plans and structured parsing. | **Free tier data may be used to improve Google products and may be read by human reviewers.** This is acceptable for the demo with synthetic or own data. Real users' health reports must not go through the unpaid tier (see Phase 14). |
| **Groq** | Free, no card. Limits are per organization. Roughly 30 RPM; tokens per minute vary by model (gpt-oss-20b about 8K TPM according to one source). | Very fast streaming. Tool use on gpt-oss and Llama models. Whisper. | Low TPM limits long tool-calling conversations. Larger models have lower limits. |

Implication: the AI layer needs a provider abstraction, caching, a per-user daily quota and deterministic fallbacks. Tool calling will be evaluated on Groq `gpt-oss-20b`, a larger Groq model, and Gemini Flash. The most reliable within free limits will be picked.

### 4.3 Reference guidance

- **ICMR-NIN Dietary Guidelines for Indians (2024).** Protein RDA is 0.83 g/kg/day; average Indian intake is about 0.66 g/kg. Above about 1.6 g/kg there is no further gain from resistance training. Protein supplements are not advised for healthy people. Use this as the baseline and for safety framing.
- **NIH Office of Dietary Supplements fact sheets** for supplement evidence, upper limits and interactions.
- **DPDP Act 2023 and Rules 2025** (notified 13 Nov 2025, phased commencement). Health data needs explicit, informed consent, plus access, correction and erasure rights, and breach notification. Required before real users (Phase 14). This is not legal advice.

---

## 5. Feature Feasibility

Complexity: S (days), M (about 1 week), L (2+ weeks). All costs are zero within free tiers; the risk is quota, not money.

### 5.1 Personalized onboarding (interactive, conditional)

- **What:** progressive, grouped questions covering body, goals, food preferences, availability, budget, lifestyle and health.
- **Feasible:** yes. **Value:** high, because it is the input to everything else.
- **Approach:** **modify the approach.** Define questions and conditional rules in code as a typed questionnaire. AI should not invent questions. AI only rephrases, clarifies free-text answers and maps them to structured fields. This makes onboarding predictable, testable and stable in its schema.
- Every question can be skipped. A skipped answer is stored as `unknown`, never as "no".
- Existing users keep working. New sections can be completed later from the profile.
- **Services:** none required. Gemini is optional for parsing free text.
- **DB:** `user_profiles` gains goal details, activity level, workout timing, diet type, allergies, intolerances, likes and dislikes, cuisines, pantry items, cooking situation, eating-out frequency, budget in INR, sleep and work hours, meal timings, water target, injuries and timezone.
- **Complexity:** M. **Risks:** questionnaire fatigue, mitigated by groups, progress display and "complete later".
- **Category:** Implement Now.

### 5.2 AI diet plan generation

- **What:** a daily or weekly meal plan with timings, items, quantities, calories, macros and fiber.
- **Feasible:** yes, with constraints. **Value:** high.
- **Approach:** **modify the approach.** Do not let the LLM invent numbers.
  1. Compute targets deterministically. Mifflin-St Jeor with the real activity factor, a goal-based deficit or surplus, protein by g/kg depending on goal (about 1.2 to 2.0 g/kg, capped around 2.2), fat at a minimum share, and carbs as the remainder.
  2. The LLM picks foods and portions within the targets and constraints (diet type, allergies, budget, pantry, cuisine), using structured output.
  3. Every item is re-costed through the food pipeline (5.3). Portions are scaled to hit targets within about ±5 to 10%.
  4. Hard filters run after generation. Allergens and excluded foods are rejected and regenerated.
- Supports regenerating one meal, replacing an ingredient, or regenerating the whole plan. Preferences are kept, and plans are versioned.
- **Services:** Gemini Flash (structured output) and the food DB.
- **DB:** `diet_plans` (versioned, with days, meals and items, each item with a source), plus `audit_logs`.
- **Complexity:** L. **Risks:** the LLM picks foods missing from the DB. Mitigation: constrain choices to DB items where possible and fall back to an "estimated" label.
- **Safety:** calorie floor, a cap on weight-loss rate (about 0.5 to 1% of bodyweight per week), and flags for under-18, pregnancy and breastfeeding that disable deficits.
- **Category:** Implement Now (after 5.1 and 5.3).

### 5.3 Automatic meal and macro calculator (highest priority)

- **What:** "2 aloo paratha with curd" becomes items, quantities, calories, protein, carbs, fats and fiber, editable before saving.
- **Feasible:** yes. **Value:** very high, because it decides daily retention.
- **Approach:**
  1. **Parse.** The LLM produces structured output: `[{dish, quantity, unit, preparation, modifiers}]`. Parsing is a much easier task for the LLM than estimating nutrition.
  2. **Match.** Look the dish up in the `foods` collection (INDB recipes, then raw foods, then USDA). Use normalized names, synonyms and Hindi or regional aliases ("chapati" = "roti" = "phulka"), with fuzzy matching. Text embeddings can come later if needed.
  3. **Quantify.** A unit table converts piece, katori, plate, glass, tbsp and grams. Use the INDB serving sizes. If the quantity is missing, suggest a default serving and mark it.
  4. **Fallback.** Only when there is no match, the LLM estimates per-serving values with structured output. The result is labelled `estimated_ai` and shown with a badge.
  5. **Cache.** Parsed and resolved dishes are cached globally, so repeat lookups cost no AI call.
- **Speed:** saved meals, recent meals, one-tap re-log and custom recipes (user-defined combinations).
- **Provenance:** each value carries a `source`: `verified_db`, `estimated_ai` or `user_edited`.
- **Evals:** a golden set of about 50 common Indian dishes with reference values. Track the mean absolute error for calories and protein.
- **Services:** Gemini Flash-Lite or Groq for parsing, INDB and USDA data.
- **DB:**
  - `foods`: name, aliases, source, per-100g and per-serving nutrients, serving units.
  - `dish_cache`.
  - `saved_meals`.
  - `meals` upgraded with items[], meal_type, eaten_at, fiber, source, edited flag, and soft delete.
- **Complexity:** L. **Risks:** restaurant dishes vary widely (oil, cheese). Show ranges where needed and allow easy edits. INDB licensing must be confirmed before real users.
- **Category:** Implement Now.

### 5.4 Daily calorie and macro tracking

- **What:** target versus consumed, remaining macros, fiber and water.
- **Feasible:** yes. Mostly exists; needs goal-based targets, fiber, supplement macros and the user's timezone.
- **Complexity:** S. **Category:** Implement Now.

### 5.5 Action-oriented AI coach

- **What:** chat that reads and writes app data: log meals, edit the diet, update weight, give remaining macros, suggest workout alternatives, manage supplements and analyse progress.
- **Feasible:** yes. **Value:** very high; this is the main differentiator.
- **Approach:**
  - **Server-side conversation store** with a context window and summarization of older turns.
  - **Tool registry.** Each tool has a Pydantic input schema and calls the same service functions as the REST API, so there is one source of truth.
  - **Reads execute directly. Writes are proposed first.** The backend returns an `action_proposal` frame and the UI renders a confirm card. The tool runs only on confirm. Destructive actions always need confirmation. Simple additive actions (log a meal) can use a one-tap confirm.
  - **Completion messages are generated from the tool result**, never from model text alone. If the backend fails, the user sees the failure.
  - **UI sync.** After an action, the WebSocket sends an `invalidate` event and the frontend refetches the affected queries. This is a good reason to adopt TanStack Query, which is already installed.
  - **Ambiguity.** Tools return "missing field" errors, and the model asks a clarifying question.
  - **Authorization.** `user_id` always comes from the authenticated socket, never from tool arguments.
- **Model:** evaluate free tool-calling models (Groq gpt-oss-20b, a larger Groq model, Gemini Flash) on a scripted set of about 30 requests, and pick the most reliable.
- **DB:** `chat_sessions` and `chat_messages` (with tool calls and results), `action_proposals`, `audit_logs`.
- **Complexity:** L. **Risks:**
  - Free TPM limits. Mitigation: keep tool schemas compact and limit history.
  - Model hallucinating success. Mitigation: confirmations come from the backend result.
- **Category:** Implement Now (after the nutrition core). The WebSocket auth fix is a prerequisite.

### 5.6 Health report upload and analysis

- **What:** upload a PDF or image, extract biomarkers, let the user verify, save to the health profile, and use the data in recommendations.
- **Feasible:** yes. **Value:** high and differentiating.
- **Approach:**
  1. Upload goes to a **private** R2 bucket. Access uses short-lived signed URLs. Size and type limits are enforced.
  2. Text PDFs are extracted locally with `pypdf` (free, and keeps data local). Scanned PDFs and images go through Gemini multimodal with a strict structured schema: name, value, unit, reference range, flag, report date, lab, page.
  3. Results are normalized to a canonical biomarker list (Hb, B12, 25-OH Vit D, TSH, T3, T4, FBS, PPBS, HbA1c, lipids, LFT, KFT, iron, ferritin and others), with unit conversion.
  4. **Verification screen.** Nothing is saved to the profile until the user confirms. Verified values are never overwritten by AI.
  5. Explanations use plain language and suggest consulting a doctor for out-of-range values. No diagnosis, no treatment dosing.
- **Privacy:** consent screen first. Deleting a report removes the file and its extracted data.
- **Free-tier caveat:** Gemini's unpaid tier may use the data for product improvement and human review. Acceptable for the demo with synthetic or own reports; must change before real users.
- **DB:** `health_reports` (file key, status, extracted raw data), `biomarkers` (value, unit, range, date, source = report or manual, verified flag, report_id), `audit_logs`.
- **Complexity:** L. **Risks:** OCR errors on poor scans, mitigated by mandatory verification. Liability is limited by not diagnosing.
- **Category:** Implement Now, in the health phase.

### 5.7 Manual health profile

- **What:** a guided, conditional questionnaire for users without reports.
- **Feasible:** yes. **Value:** high. Cheaper and safer than reports, so build it first.
- **Approach:** the same typed questionnaire engine as onboarding. Every fact carries a provenance (`report_extracted`, `user_reported`, `unknown`). Missing information is never treated as healthy.
- **DB:** `health_profile` (conditions, deficiencies with optional value and date, medications, allergies, digestive issues, injuries, each with provenance).
- **Complexity:** M. **Category:** Implement Now.

### 5.8 Supplement recommendations

- **What:** personalised suitability for common, evidence-based supplements.
- **Feasible:** yes, if the knowledge is curated. **Value:** medium to high.
- **Approach:** **modify the approach.**
  - A curated, versioned knowledge base of about 15 to 20 supplements: whey, plant protein, creatine monohydrate, vitamin D3, B12, omega-3, magnesium, iron, calcium, electrolytes, caffeine, zinc, multivitamin and others.
  - Each entry has evidence grades (strong, limited, insufficient) per use case, benefits, side effects, contraindications, interactions, upper limits and NIH ODS or peer-reviewed sources.
  - **Rule engine** for safety flags. Examples: kidney disease with creatine or high protein; anticoagulants with omega-3 or vitamin K; thyroid medication timing with calcium or iron; pregnancy.
  - The LLM only explains the knowledge-base entries in the context of the user's data. It does not prescribe treatment doses for deficiencies.
  - Blocklist: steroids, SARMs, PEDs, hormones, risky fat burners.
- **DB:** `supplement_catalog` (curated, seeded from code), `user_supplements`, `supplement_logs`.
- **Complexity:** M. **Category:** Implement Now (knowledge base and rules); the AI explanation layer comes with it.

### 5.9 Supplement tracking

- **What:** add, edit and remove supplements; daily check-off; history; protein powder macros feed nutrition. Vitamins add no calories.
- **Feasible:** yes, simple. **Complexity:** S to M. **Category:** Implement Now.

### 5.10 Supplement product discovery

- **What:** real products with price, cost per serving and certifications.
- **Feasible technically, but not reliably on free data.** There is no free, trustworthy API for Indian supplement prices or third-party test results. Scraping marketplaces is fragile and against their terms, and showing unverified certifications contradicts the brief's own rules.
- **Category:** **Not Recommended now.** Revisit later with a small manually curated list (brand, label facts, verifiable certification links) or affiliate APIs.

### 5.11 Workout alternatives

- **What:** a same-day replacement session when the gym, equipment or time is not available.
- **Feasible:** yes; it builds on the existing plan. **Value:** high and cheap.
- **Approach:**
  - Inputs: scheduled session, target muscles, available equipment, minutes available, recovery score and injuries.
  - Gemini returns structured output with sets, reps, rest, instructions, equipment and alternatives.
  - The result is stored as a **day override**; the original plan stays untouched and the user chooses whether to apply it.
  - Intensity is capped when recovery is low or an injury is present.
- **DB:** `workout_overrides`. Exercise entries gain target_muscles and instructions.
- **Complexity:** M. **Category:** Implement Now.

### 5.12 Progress analysis and adaptive nutrition

- **What:** daily and weekly trends, goal progress, patterns, and adaptive targets.
- **Feasible:** yes. **Value:** high.
- **Approach:**
  - Weight trend is an exponentially weighted moving average.
  - Adaptive TDEE uses the energy-balance back-calculation (MacroFactor-style). It needs 14 or more days of reasonably complete logging and 7 or more weigh-ins.
  - Adjustments are suggested and need user confirmation, with a maximum change per week.
  - Pattern detection is deterministic: protein misses, calorie overshoot, logging gaps, workout consistency, plateau over 3 or more weeks.
  - The LLM only writes the narrative from computed facts. The existing weekly report is upgraded.
- **DB:** `daily_summaries` (materialized per user-day), `target_history`.
- **Complexity:** M to L. **Category:** Implement Now (later in the order, since it needs data).

### 5.13 UI and UX overhaul

- **Feasible:** yes. **Approach:**
  - Design tokens and a component set first; existing branding (purple primary, teal secondary, Sora and Inter fonts) is kept but toned down.
  - Pages are migrated one by one, and every new feature is built on the system.
  - Dark mode, consistent empty, loading and error states, and adoption of TanStack Query.
- **Complexity:** M to L, spread across phases. **Category:** Implement Now (incrementally).

### 5.14 AI communication quality

- **Approach:** one shared style guide prompt module used by every AI call. It contains the brief's tone rules plus few-shot good and bad examples. Every generated string goes through it, and each AI surface has its own short task prompt. A lint-style test flags banned phrases ("Great question", emojis, em dashes) in eval outputs.
- **Complexity:** S. **Category:** Implement Now (Phase 1).

### 5.15 Food photo logging

- **Category:** **Implement Later.** Free vision models are weak at estimating portions in mixed Indian plates. Text logging has to be good first. A future version could identify dishes from the photo, then pass them through the same quantity confirmation as text logging.

### 5.16 Barcode scanning

- **Category:** **Implement Later.** Uses Open Food Facts. Accurate for packaged food, but India coverage is uncertain.

### 5.17 Fitness around a working day

Added after Phase 5. Most people with office or work schedules know roughly what to do; what stops them is time, energy, eating out and long sitting hours. These features target that directly.

- **Time-boxed workouts.** "I have 15 minutes, at home, no equipment" produces a full session that fits, with recovery and injury caps. Builds on 5.11. Phase 7.
- **Meal-time nudges and an easy restart.** Reminders at the user's own meal times (from the plan or routine), and after missed days a short "start again" message with one easy action, never guilt. Reuses notifications. Phase 6.
- **"What should I order?"** The coach takes a restaurant or delivery menu (typed, pasted or a photo of the menu) and suggests the best options for the user's remaining calories and protein, with honest estimates. Phase 6.
- **Shift-aware meal times.** Plan meal times follow night and rotating shifts instead of day defaults. Small fix, Phase 6.
- **Activity and desk life.** Daily steps (manual entry first), a step target, short desk mobility and posture routines, and break reminders during work hours. Steps feed the activity estimate behind targets. **Constraint:** Google Health Connect is an on-device Android API and the Google Fit REST API is being shut down, so automatic step sync needs a native wrapper (for example Capacitor) and is a later step. Phase 12.
- **Flexible days.** The user marks a weekend, festival, wedding or travel day as flexible; it can go over target on purpose and the week's remaining days are balanced gently, within the usual safety floors. Phase 11.
- **Later ideas.** Family-style plans (the same dishes as the household with only the user's portions changed) and rough food prices so the budget becomes a real constraint, not a hint.

---

## 6. Features Missing From the Brief

| Feature | Why | Category |
|---|---|---|
| Per-user timezone and day boundaries | Correct "today" for logging, plans and jobs. | Now (Phase 1) |
| Meal and workout edit, delete and undo | Basic trust in the data. | Now |
| Server-side chat history | Needed for context and for actions. | Now |
| Per-user AI quota and caching | Survive free-tier limits and prevent abuse. | Now |
| Safety guardrails | Calorie floor, rate-of-loss cap, minors, pregnancy, eating-disorder signals, crisis wording. | Now |
| Consent, data export and account deletion cascade | Health data responsibility; required by DPDP before real users. | Now (basic), Phase 14 (full) |
| Audit log | Requested in the brief for plans, health and supplements. | Now |
| AI evals | Detect regressions in food estimation, extraction and tool calling. | Now |
| Reminders (meals, water, supplements) | Engagement; reuses notifications. | Meals in Phase 6 (see 5.17), others later |
| Dark mode | Expected in a modern app. | With the design system |
| Hindi or Hinglish food names in search | India-first logging ("dal chawal", "rajma chawal"). | Now (aliases in the food DB) |

---

## 7. Recommended Architecture Changes

1. **Keep the layered FastAPI structure.** Add these modules: `ai/` (provider abstraction, style guide, structured output, quota, cache), `tools/` (coach tool registry), `nutrition/food_db` (lookup and matching), `health/`, `supplements/`.
2. **Remove the in-memory fallback** when `DATABASE_ENV != local`. Fail fast with a clear health check. Keep it only for local development and tests, or replace it with a test database.
3. **Async everywhere.** Use async AI clients, or `asyncio.to_thread` for sync SDKs. Move slow jobs (report extraction) to background tasks with status polling.
4. **Authenticated WebSocket.** The JWT is sent in the first frame or as a query token and verified before connecting; user_id comes from the token. One socket per client, multiplexed for chat and notifications.
5. **Atomic updates.** Use `$set` with only the changed fields and `$inc` for XP. Remove the client XP endpoint; XP is awarded by the server only, with deduplication.
6. **Frontend data layer.** Adopt TanStack Query for server state, with query keys per domain, so coach actions can invalidate them.
7. **Pin dependencies** and complete `render.yaml`. Move scheduled jobs to a timezone-aware design; note that Render free sleeps, so jobs may need a free external cron ping.
8. **Testing.** Backend pytest with a real Mongo, either a local container or mongomock-motor. Frontend Vitest for utilities. Playwright for the 10 journeys in Phase 13.

---

## 8. AI Integration Recommendations

| Task | Model (free) | Pattern |
|---|---|---|
| Food text parsing | Gemini Flash-Lite (structured) or Groq | Strict JSON schema, Pydantic validation, cache by normalized text. |
| Nutrition fallback estimate | Gemini Flash | Only when the DB has no match. Label as estimated and validate ranges, for example that kcal roughly equals 4P + 4C + 9F. |
| Diet plan composition | Gemini Flash | Targets come from code. Choose foods only, then re-cost through the DB. |
| Report extraction | `pypdf` first, then Gemini multimodal | Schema-bound output with page references and mandatory user verification. |
| Coach (chat and tools) | Chosen by eval: Groq gpt-oss-20b, a larger Groq model, or Gemini Flash | Tool registry, propose and confirm for writes, results from the backend. |
| Workout alternatives | Gemini Flash | Structured, intensity-capped by rules. |
| Weekly insights | Gemini Flash-Lite | Facts computed in code; the LLM writes the narrative only. |
| Transcription | Groq Whisper | Unchanged. |

Cross-cutting rules:

- Every AI output that feeds data goes through a Pydantic model. On validation failure, retry once, then fall back deterministically.
- The style guide prompt applies everywhere. Empty states and notifications use templates, not generation.
- Hardcoded AI responses are not allowed; fallbacks must be honest ("Couldn't estimate this right now, please enter values or try again").
- Personal identifiers are never sent to AI providers. Use the minimum health context needed.

---

## 9. Database Modifications

New collections:

| Collection | Key fields |
|---|---|
| `user_profiles` (or extended `users`) | timezone, activity_level, workout_days and time, diet_type, allergies[], intolerances[], likes[], dislikes[], excluded[], cuisines[], pantry[], cooks_self, eating_out_freq, budget_inr, sleep and work schedule, meal_times, water_target, injuries[]. Every field supports `unknown`. |
| `foods` | name, aliases[], category, source (INDB, IFCT, USDA, AI, user), per_100g{kcal, p, c, f, fiber}, servings[{unit, grams}], verified |
| `dish_cache` | normalized_text, parsed_items, resolved_food_ids, created_at |
| `saved_meals` | user_id, name, items[], totals |
| `meals` (extended) | items[{food_id, name, qty, unit, grams, nutrients, source}], meal_type, eaten_at (UTC) and local_date, fiber, source, edited, deleted_at |
| `diet_plans` | user_id, version, targets, days[{meals[{name, time, items[]}]}], status, created_by (user or ai) |
| `workout_overrides` | user_id, date, original_session, replacement, reason, applied |
| `health_profile` | user_id, conditions[], deficiencies[], medications[], allergies[], digestive[], injuries[], each with provenance and updated_at |
| `health_reports` | user_id, file_key, mime, status, report_date, lab, raw_extraction, created_at |
| `biomarkers` | user_id, code, name, value, unit, ref_low, ref_high, flag, measured_at, source (report or manual), report_id, verified |
| `supplement_catalog` | key, name, evidence[], benefits, side_effects, contraindications[], interactions[], sources[], version |
| `user_supplements` | user_id, catalog_key, brand, product, serving, dose, frequency, time, start_date, notes, macros_per_serving, active |
| `supplement_logs` | user_id, user_supplement_id, local_date, taken |
| `chat_sessions` and `chat_messages` | user_id, role, content, tool_calls, tool_results, created_at |
| `action_proposals` | user_id, tool, args, status (pending, confirmed, rejected, executed, failed), result |
| `audit_logs` | user_id, entity, entity_id, action, actor (user, ai or system), before, after, at |
| `daily_summaries` | user_id, local_date, intake totals, water, weight, workout_done, supplements_taken |
| `consents` | user_id, type, version, granted_at, revoked_at |

Indexes: compound `(user_id, local_date)` on day-based collections; unique on `users.email` (lowercased) and `users.username`; text or alias index on `foods`.

Migration: additive only. Existing documents remain valid. New fields default to `unknown` or empty. A one-time script backfills `local_date` and `timezone=Asia/Kolkata` for existing users.

---

## 10. Implementation Roadmap

Each phase ends with tests passing, a demo of the user journeys it covers, and a commit. Nothing is pushed without explicit approval.

| Phase | Name | Main deliverables | Covers brief section |
|---|---|---|---|
| 0 | Audit (this document) | Assessment, research, feasibility, roadmap. | 1 |
| 1 | Foundation and hardening | WebSocket auth; remove the client XP endpoint and deduplicate XP; atomic user updates; account deletion cascade; production DB fail-fast; JWT, DEBUG and CORS hardening; user timezone and local dates; async AI calls; AI layer (provider abstraction, structured output, quota, cache, style guide); audit log; pinned dependencies; test setup and tests for existing flows; injuries field and onboarding validation. | 11, 12 |
| 2 | Design system and app shell | Tokens, light and dark themes, core components, TanStack Query adoption, layout and navigation cleanup, existing pages migrated without functional change. | 10 |
| 3 | Nutrition core | Food DB import (INDB, USDA fallback), parse, match and quantify pipeline, dish cache, meal model upgrade with edit, delete and provenance, saved and recent meals, custom recipes, fast log UI, golden-set evals. | 3 |
| 4 | Onboarding v2 and targets | Typed conditional questionnaire, food, budget and lifestyle profile, goal-based targets (g/kg protein), safety floors and flags, migration for existing users. | 2 (profile) |
| 5 | AI diet plan | Constrained generation, DB re-costing, allergen filters, regenerate meal, swap ingredient, regenerate plan, versioning, log from plan. | 2 (plan) |
| 6 | Action-taking coach | Chat persistence, tool registry, propose and confirm flow, backend-sourced confirmations, UI invalidation, model selection by eval. "What should I order?" from a menu, meal-time nudges and an easy restart after missed days, shift-aware plan meal times (5.17). | 8 |
| 7 | Workout intelligence | Alternatives with day override, recovery and injury caps, time-boxed and no-equipment sessions (10, 15, 20 minutes), coach tool. | 7 |
| 8 | Manual health profile and consent | Consent flow, conditional health questionnaire, provenance, health context in plans and coach. | 5 |
| 9 | Health report upload | Private storage, local and Gemini extraction, verification UI, biomarker history, safe explanations, delete. | 4 |
| 10 | Supplements | Curated catalog, rule-based safety flags, personalised explanations, tracking and macros, coach tools. | 6.1 to 6.4 |
| 11 | Progress intelligence | Weight trend, adaptive TDEE suggestions, pattern detection, weekly insights, flexible days for weekends, festivals and travel, dashboard redesign. | 9 |
| 12 | Activity and desk life | Daily steps (manual entry), step target, steps feeding the activity estimate, desk mobility and posture routines, work-hours break reminders. Automatic step sync (Health Connect via a native wrapper) is a later step. | 5.17 |
| 13 | Demo readiness | Playwright E2E for the 10 journeys, failure-mode tests, demo seed data, free-tier tuning, error monitoring (Sentry free), README overview update. | 14 |
| 14 | Real-user readiness (later) | DPDP compliance, paid or no-training AI tier for health data, field encryption, backups, reconsider barcode, photo logging, product discovery, water and supplement reminders, family-style plans, food prices for real budget limits. | 6.5, compliance |

Why this order differs slightly from the brief:

- Security fixes and the AI layer come first, because every later phase depends on them and health data must not land on an unauthenticated socket.
- The design system comes early, so features are not built twice.
- The coach follows nutrition because its tools are the nutrition services.
- The manual health profile comes before report upload because it is cheaper, safer, and builds the schema that reports will fill.
- The working-day features (5.17) are folded into the phases they extend, so they don't wait for a separate phase. Activity gets its own phase because it adds a new kind of data.

---

## 11. Risks and Dependencies

| Risk | Impact | Mitigation |
|---|---|---|
| Free AI quotas (RPM, TPM, RPD) | Slow or failed AI features during demos. | Caching, per-user quotas, deterministic fallbacks, provider switch. |
| Gemini free tier data use and human review | Privacy of health data. | Demo with synthetic data only; paid or no-training provider before real users. |
| INDB and IFCT licensing | Data use rights for real users. | Attribution now; confirm terms with the authors before launch; USDA (CC0) as fallback. |
| Nutrition accuracy for restaurant and home variations | User trust. | Provenance badges, easy edits, golden-set evals, ranges where uncertain. |
| Tool-calling reliability on free models | Coach takes wrong actions. | Propose and confirm, schema validation, eval suite, backend-sourced confirmations. |
| Medical liability | Harm or legal exposure. | No diagnosis or treatment dosing, professional-consultation prompts, curated supplement data, disclaimers. |
| Render free sleep and single process | Missed jobs, cold starts, in-memory state. | External free cron ping, tolerant bootstrap, stateless design where possible. |
| Atlas M0 storage limit (512 MB) | Database fills up. | Report files go to R2, not Mongo; prune caches. |
| Scope size | Phases slip, features stay half-done. | Vertical slices, a definition of done per phase, and no phase starts before the previous one passes tests. |

---

## 12. Sources

- INDB paper: Vijayakumar et al., *Current Developments in Nutrition* (2024). https://pmc.ncbi.nlm.nih.gov/articles/PMC11277795/
- INDB data repository: https://github.com/lindsayjaacks/Indian-Nutrient-Databank-INDB-
- IFCT 2017 community extracts: https://jsr.io/@nodef/ifct2017
- USDA FoodData Central API guide: https://fdc.nal.usda.gov/api-guide
- Open Food Facts API documentation: https://openfoodfacts.github.io/openfoodfacts-server/api/
- Gemini API Additional Terms: https://ai.google.dev/gemini-api/terms
- Groq free plan overview (third party, verify in console): https://costbench.com/software/llm-api-providers/groq/free-plan/
- MacroFactor algorithms and philosophy: https://macrofactor.com/macrofactors-algorithms-and-core-philosophy/
- Healthify AI coaching: https://openai.com/index/healthify and https://en.wikipedia.org/wiki/HealthifyMe
- Cronometer vs MyFitnessPal (secondary): https://www.welling.ai/articles/myfitnesspal-vs-cronometer-2026
- ICMR-NIN Dietary Guidelines 2024 (secondary summaries): https://nutritionconnect.org/resource-center/dietary-guidelines-indians-2024-edition-icmr-nin and https://thesouthfirst.com/news/icmr-releases-dietary-guidelines-for-indians-after-13-years-says-no-to-protein-supplements
- DPDP Act and Rules in healthcare (KPMG): https://assets.kpmg.com/content/dam/kpmgsites/in/pdf/2025/12/the-privacy-prescription-impact-of-dpdp-act-and-rules-in-healthcare-and-life-sciences-sector.pdf.coredownload.pdf
- NIH Office of Dietary Supplements: https://ods.od.nih.gov/

Some figures come from secondary sources and are marked as such. Free-tier limits change often and must be checked in each provider's console before relying on them.
