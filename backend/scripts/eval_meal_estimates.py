"""Run the golden meal set through the real estimator and report how it did.

Uses the AI keys from .env.local (each case costs one parse call, plus one
estimate call per food not in the datasets). Run it after changing prompts,
models or the food data:

    python scripts/eval_meal_estimates.py [--json out.json]

A case passes when the total kcal falls inside its range and at least the
expected number of foods were found with no unresolved items.
"""
import argparse
import asyncio
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.nutrition.estimator import estimate_meal  # noqa: E402

GOLDEN = Path(__file__).resolve().parents[1] / "evals" / "indian_meals.json"


async def run() -> list:
    cases = json.loads(GOLDEN.read_text(encoding="utf-8"))["cases"]
    results = []
    for case in cases:
        estimate = await estimate_meal(case["text"])
        low, high = case["kcal"]
        kcal = estimate.totals.kcal
        passed = (
            low <= kcal <= high
            and len(estimate.items) >= case["min_items"]
            and estimate.unresolved_count == 0
        )
        results.append({
            "text": case["text"],
            "kcal": kcal,
            "range": case["kcal"],
            "passed": passed,
            "items": [
                f"{i.quantity:g} {i.unit} {i.name} [{i.source}] {i.nutrients.kcal if i.nutrients else '?'} kcal"
                for i in estimate.items
            ],
        })
        mark = "PASS" if passed else "FAIL"
        print(f"{mark}  {case['text']:<34} {kcal:>6.0f} kcal  (range {low}-{high})")
        if not passed:
            for line in results[-1]["items"]:
                print(f"        {line}")
    return results


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--json", help="write detailed results to this file")
    args = parser.parse_args()
    results = asyncio.run(run())
    passed = sum(r["passed"] for r in results)
    verified = sum(
        line.count("[INDB]") + line.count("[USDA]") for r in results for line in r["items"]
    )
    total_items = sum(len(r["items"]) for r in results)
    print(f"\n{passed}/{len(results)} cases in range; {verified}/{total_items} foods from datasets")
    if args.json:
        Path(args.json).write_text(json.dumps(results, indent=1), encoding="utf-8")


if __name__ == "__main__":
    main()
