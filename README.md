# FitMind AI

**A fitness and nutrition coach built for how India eats.**

Most calorie apps are built around Western food and barcodes. Indian meals are home-cooked, mixed, and described in a mix of English and Hindi. FitMind lets you log food the way you'd tell a friend about it, then turns that into accurate nutrition, personal targets and a plan you can actually follow.

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

- **Live app:** https://fitmind-ai-lyart.vercel.app
- **API docs:** https://fitmind-backend-vr5y.onrender.com/docs

> The backend runs on a free tier and sleeps when idle, so the first request can take up to a minute.

---

## Highlights

### Log a whole day in one sentence

Type or speak something like *"subah 2 idli aur chai, dopahar ko dal chawal, raat ko khichdi"* and FitMind splits it into breakfast, lunch and dinner, works out the portions, and gives you calories and macros for each meal. English, Hindi and Hinglish all work.

### Nutrition you can trust

Numbers come from verified food databases first: INDB for Indian dishes and USDA for everyday staples. Only when a food isn't in either does the AI step in, and those values are checked for consistency and clearly labelled as estimates. Every item shows where its numbers came from, and you can correct anything before saving.

### Targets made for you

A short onboarding asks about your body, goal, activity, food habits (veg, eggetarian, non-veg, Jain, allergies), budget and daily routine. From that, FitMind calculates calorie, protein, carb, fat, fiber and water targets using established formulas, with built-in safety limits. The app explains how every number was set.

### Training that adapts to how you feel

A quick voice check-in picks up your mood and energy, and a daily recovery score comes from sleep, stress and soreness. Your weekly workout plan adjusts to both, so hard days happen when you're ready for them.

### A coach that knows your context

A real-time chat coach that sees your plan, recovery and progress, backed by streaks, XP, friends, a weekly leaderboard and an automated weekly recap.

---

## On the roadmap

- **Personal diet plans** built around your targets, preferences, budget and kitchen, with one-tap swaps and logging straight from the plan.
- **A coach that takes action**: log meals, swap dishes or move workouts from chat, always with your confirmation.
- **Health reports**: upload a blood report, review the extracted values and track them over time in plain language.
- **Smarter workouts** with exercise alternatives based on equipment, injuries and recovery.
- **Supplement guidance** that puts safety first.
- **Progress insights** with weight trends and targets that adapt to your real results.

Before opening to the public: full data privacy compliance (DPDP), encryption and backups.

---

## Under the hood

| Layer | Stack |
|---|---|
| Frontend | React 19, TypeScript, Vite, MUI, TanStack Query, Zustand |
| Backend | FastAPI, Python 3.12, MongoDB, WebSockets, APScheduler |
| AI | Gemini and Groq (Whisper for speech), with validated structured output, caching and per-user limits |
| Infrastructure | Docker, Render, Vercel, MongoDB Atlas, Cloudflare R2 |

Designed and built end to end by **Dhruv Sharma**: product, backend, frontend, AI integration and deployment.

## License

MIT, see [LICENSE](LICENSE).
