# FitMind AI

**A fitness and nutrition coach built for how India eats, trains and works.**

Most calorie apps are built around Western food and barcodes. Indian meals are home-cooked, mixed, and described in a mix of English and Hindi, and most people trying to get fit are also juggling an office day. FitMind lets you log food the way you'd tell a friend about it, then turns that into accurate nutrition, personal targets, a meal plan and a workout plan that fit around your day.

<p>
  <img alt="React" src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white" />
  <img alt="FastAPI" src="https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white" />
  <img alt="Python" src="https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white" />
  <img alt="MongoDB" src="https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=white" />
  <img alt="MUI" src="https://img.shields.io/badge/MUI-9-007FFF?logo=mui&logoColor=white" />
  <img alt="PWA" src="https://img.shields.io/badge/PWA-installable-5A0FC8?logo=pwa&logoColor=white" />
  <img alt="License" src="https://img.shields.io/badge/License-MIT-yellow" />
</p>

- **Live app:** https://fitmind-ai-lyart.vercel.app
- **API docs:** https://fitmind-backend-vr5y.onrender.com/docs

> The backend runs on a free tier and sleeps when idle, so the first request can take up to a minute.

---

## What it does

### Your day on one screen

Open the app and Today shows what matters right now: your next meal from the plan with a one-tap "I ate this", what's left of your calories and protein, today's workout, water, and a quick recovery check-in. Miss a couple of days and it offers an easy restart instead of a guilt trip. The app installs to your phone's home screen and can remind you at your own meal and workout times.

### Log a whole day in one sentence

Type or speak something like *"subah 2 idli aur chai, dopahar ko dal chawal, raat ko khichdi"* and FitMind splits it into meals, works out the portions, and gives you calories and macros for each one. English, Hindi and Hinglish all work. You can also scan a packaged food's barcode or snap a photo of your plate.

### Nutrition you can trust

Numbers come from verified food databases first: INDB for Indian dishes, USDA for everyday staples and Open Food Facts for packaged foods. Only when a food isn't in any of them does the AI step in, and those values are clearly labelled as estimates. Every item shows where its numbers came from, and you can correct anything before saving.

### A meal plan that looks like home food

Your daily plan is built from real Indian dishes that fit your targets, diet (veg, eggetarian, non-veg, Jain), allergies, dislikes and budget. The AI only picks dishes; portions and numbers are worked out from the food database. Swap any item, ask for a different option, or log a meal straight from the plan. If you train in the morning, the day starts with water and a pre-workout snack and ends with a wind-down before sleep.

### Workouts from a real exercise library

Weekly plans follow ACSM and WHO guidelines for sets, reps and rest, and adapt to your equipment, injuries and how recovered you are. Every exercise has a demonstration, a body map of the muscles it works, setup, form cues and common mistakes. Short on time? A 10, 15 or 20 minute session fits the day instead.

### Built for desk jobs

Log your daily steps and the app adjusts your activity estimate. Short desk routines for the neck, back, hips and wrists, and gentle break reminders during work hours, help undo long hours of sitting.

### Progress you can actually see

A smoothed weight trend that ignores day-to-day water swings, waist and hip measurements, and private progress photos. After a few weeks of logging, FitMind compares what you ate with how your weight moved and suggests a better calorie target, which you can accept or ignore. It points out habits worth a look, writes a short note on each week, and lets you mark weddings, festivals or trips as flexible days. Friend challenges and a shareable weekly summary keep it social.

### A coach that can take action

The chat coach sees your plan, targets, workouts and recovery. Ask it to log a meal, add water, swap a dish or start a quick workout, and it shows you exactly what will change before anything happens. Paste a restaurant menu and ask "what should I order?" to get the best options for what's left of your day.

---

## In progress

These are built on the server and are getting their screens next:

- **Fasting and festival modes** for Navratri, Ramadan, Ekadashi and Jain Paryushan, with the right food rules and meal timings (sehri and iftar during Ramadan).
- **A grocery list** for the week, built from your meal plan and grouped by aisle.
- **Meal times for night and rotating shifts.**
- **A private health profile** with clear consent, used to make plans safer, for example for diabetes, thyroid or blood pressure.
- **Lab report upload**: values are read from your report, you check them, and they're tracked over time with plain-language explanations. Never a diagnosis.
- **Supplement guidance** that puts safety first, with daily tracking and warnings based on your health profile.

Health data is encrypted at rest and deleted along with your account.

## Next

- End-to-end tests for the main journeys, demo data and error monitoring.

## Later

- Full data privacy compliance (DPDP) before opening to the public.
- A paid AI tier that doesn't train on health data.
- Family-style plans and real food prices, so your budget becomes a real limit.

---

## Under the hood

| Layer | Stack |
|---|---|
| Frontend | React 19, TypeScript, Vite, MUI, TanStack Query, Zustand, installable PWA with Web Push |
| Backend | FastAPI, Python 3.12, MongoDB, WebSockets, APScheduler |
| AI | Gemini and Groq (Whisper for speech), with validated structured output, rule-based fallbacks, caching and per-user limits |
| Data | INDB, USDA FoodData Central, Open Food Facts, free-exercise-db |
| Infrastructure | Docker, Render, Vercel, MongoDB Atlas, Cloudflare R2 |

Designed and built end to end by **Dhruv Sharma**: product, backend, frontend, AI integration and deployment.

## License

MIT, see [LICENSE](LICENSE).
