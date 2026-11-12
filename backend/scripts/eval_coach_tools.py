"""Score candidate models on the coach's tool use and pick the most reliable.

Each case in evals/coach_tools.json is one user message. The model gets the
coach's real system prompt and tool list (see app/services/chat_service.py)
with a fixed context, and must call the expected tool with the expected
arguments. Read tools it calls first get canned results and one more round,
as in the app. Uses the AI keys from .env.local; no user quota is charged.

    python scripts/eval_coach_tools.py
    python scripts/eval_coach_tools.py --models groq:openai/gpt-oss-20b,gemini:gemini-2.5-flash
    python scripts/eval_coach_tools.py --delay 4 --json out.json

Set the winner with COACH_PROVIDERS / COACH_GEMINI_MODEL / COACH_GROQ_MODEL.
"""
import argparse
import asyncio
import json
import sys
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from pydantic import ValidationError  # noqa: E402

from app.ai import client as ai_client  # noqa: E402
from app.ai.client import AIError  # noqa: E402
from app.coach import registry  # noqa: E402
from app.services import chat_service  # noqa: E402

EVAL_FILE = Path(__file__).resolve().parents[1] / "evals" / "coach_tools.json"

DEFAULT_CANDIDATES = [
    "gemini:gemini-3.1-flash-lite",
    "gemini:gemini-2.5-flash",
    "groq:openai/gpt-oss-20b",
    "groq:openai/gpt-oss-120b",
    "groq:llama-3.3-70b-versatile",
]

# What read tools return during the eval (the real ones need a user).
CANNED = {
    "get_nutrition_today": {"eaten": {"kcal": 820, "protein": 38}, "targets": {"kcal": 1900, "protein": 120},
                            "remaining": {"kcal": 1080, "protein": 82}, "water_ml": 900, "water_goal_ml": 2700},
    "get_meal_plan": {"has_plan": True, "meals": [
        {"meal": "breakfast", "items": ["1 plate poha", "1 cup milk"], "kcal": 420, "logged_today": True},
        {"meal": "lunch", "items": ["2 piece roti", "1 bowl paneer bhurji", "1 bowl salad"], "kcal": 560,
         "logged_today": False},
        {"meal": "dinner", "items": ["1 cup rice", "1 bowl dal", "1 bowl bhindi"], "kcal": 520,
         "logged_today": False},
    ]},
    "get_today_workout": {"focus": "Upper body", "exercises": [{"name": "Push-up", "sets": 3, "reps": "8-12"}]},
    "get_recovery": {"latest_score": 64, "last_7": [{"score": 58}, {"score": 64}]},
    "get_weight_trend": {"entries": [{"date": "2026-10-15", "kg": 79.4}, {"date": "2026-11-11", "kg": 78.0}],
                         "change_kg": -1.4},
}


def _args_match(expected: Dict[str, Any], actual: Dict[str, Any]) -> bool:
    for key, want in expected.items():
        got = actual.get(key)
        if isinstance(want, (int, float)) and not isinstance(want, bool):
            try:
                if abs(float(got) - float(want)) > 1e-6:
                    return False
            except (TypeError, ValueError):
                return False
        elif isinstance(want, str):
            if not isinstance(got, str) or want.lower() not in got.lower():
                return False
        elif got != want:
            return False
    return True


def _valid(name: str, args: Dict[str, Any]) -> bool:
    tool = registry.get(name)
    if tool is None:
        return False
    try:
        tool.args.model_validate(args)
    except ValidationError:
        return False
    return True


async def _run_case(case: dict, context: str, provider: str, model: str) -> dict:
    results: List[dict] = []
    calls_seen: List[dict] = []
    started = time.perf_counter()
    for _ in range(2):
        step = await ai_client.generate_json(
            chat_service._prompt(context, "", case["prompt"], results),
            chat_service.CoachTurn,
            system=chat_service.system_prompt(),
            temperature=0.2,
            providers=(provider,),
            models={provider: model},
        )
        calls = [{"name": c.name, "args": c.args} for c in step.tool_calls]
        calls_seen += calls
        reads = [c for c in calls if c["name"] in CANNED]
        actions = [c for c in calls if registry.get(c["name"]) and registry.get(c["name"]).kind == "action"]
        if actions or not reads:
            break
        results += [{"tool": c["name"], "result": CANNED[c["name"]]} for c in reads]
    latency = time.perf_counter() - started
    return {"calls": calls_seen, "latency": latency, "passed": _score(case, calls_seen)}


def _score(case: dict, calls: List[dict]) -> bool:
    expected: Optional[str] = case["expected_tool"]
    actions = [c for c in calls if registry.get(c["name"]) and registry.get(c["name"]).kind == "action"
               and _valid(c["name"], c["args"])]
    if expected is None:
        return not actions
    good = [c for c in calls if c["name"] == expected and _valid(c["name"], c["args"])
            and _args_match(case.get("expected_args", {}), c["args"])]
    others = [c for c in actions if c["name"] != expected]
    return bool(good) and not others


async def evaluate(candidate: str, cases: List[dict], context: str, delay: float) -> dict:
    provider, model = candidate.split(":", 1)
    rows = []
    errors = 0
    for case in cases:
        try:
            row = await _run_case(case, context, provider, model)
        except AIError as e:
            errors += 1
            row = {"calls": [], "latency": 0.0, "passed": False, "error": str(e)[:200]}
        rows.append({"prompt": case["prompt"], **row})
        mark = "PASS" if row["passed"] else ("ERR " if "error" in row else "FAIL")
        shown = ", ".join(f"{c['name']}{json.dumps(c['args'])}" for c in row["calls"]) or row.get("error", "-")
        print(f"  {mark} {case['prompt'][:52]:<52} -> {shown[:110]}")
        await asyncio.sleep(delay)
    passed = sum(r["passed"] for r in rows)
    latencies = sorted(r["latency"] for r in rows if "error" not in r)
    median = latencies[len(latencies) // 2] if latencies else None
    return {"candidate": candidate, "passed": passed, "total": len(rows), "errors": errors,
            "median_latency_s": round(median, 2) if median else None, "rows": rows}


async def main_async(candidates: List[str], delay: float, limit: Optional[int]) -> List[dict]:
    data = json.loads(EVAL_FILE.read_text(encoding="utf-8"))
    cases = data["cases"][:limit] if limit else data["cases"]
    summaries = []
    for candidate in candidates:
        print(f"\n== {candidate}")
        summaries.append(await evaluate(candidate, cases, data["context"], delay))
    print("\nModel                                     pass   errors  median s")
    for s in sorted(summaries, key=lambda s: (-s["passed"], s["errors"], s["median_latency_s"] or 99)):
        print(f"{s['candidate']:<42}{s['passed']:>3}/{s['total']:<4}{s['errors']:>5}   {s['median_latency_s']}")
    return summaries


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--models", help="comma-separated provider:model list")
    parser.add_argument("--delay", type=float, default=3.0, help="seconds between calls (free-tier limits)")
    parser.add_argument("--limit", type=int, help="only the first N cases")
    parser.add_argument("--json", help="write detailed results to this file")
    args = parser.parse_args()
    candidates = args.models.split(",") if args.models else DEFAULT_CANDIDATES
    summaries = asyncio.run(main_async(candidates, args.delay, args.limit))
    if args.json:
        Path(args.json).write_text(json.dumps(summaries, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
