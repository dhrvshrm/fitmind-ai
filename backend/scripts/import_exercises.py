"""Build the exercise catalogue from free-exercise-db (public domain, Unlicense).

    https://github.com/yuhonas/free-exercise-db

Usage (from backend/):
    python scripts/import_exercises.py [path to exercises.json]

Without a path, the dataset is downloaded at the pinned commit below, so the
catalogue can't silently change. Writes app/workouts/data/exercises.json.

What the import changes:
- Olympic lifts and strongman events are left out. They need in-person
  coaching to learn safely and aren't suitable for an app-led plan.
- Fields are renamed to snake_case; values are kept as published. Known
  data errors are corrected in the curated layer (curated.json), not here.
"""
import json
import sys
import urllib.request
from pathlib import Path

COMMIT = "f00c92c7dcf1216a928a52c3706c7ce8e2f71ed5"
SOURCE_URL = f"https://raw.githubusercontent.com/yuhonas/free-exercise-db/{COMMIT}/dist/exercises.json"
OUTPUT = Path(__file__).resolve().parents[1] / "app" / "workouts" / "data" / "exercises.json"
EXCLUDED_CATEGORIES = {"olympic weightlifting", "strongman"}


def load(path: str | None) -> list:
    if path:
        return json.loads(Path(path).read_text(encoding="utf-8"))
    with urllib.request.urlopen(SOURCE_URL, timeout=60) as response:  # noqa: S310 (fixed https URL)
        return json.loads(response.read().decode("utf-8"))


def convert(raw: dict) -> dict:
    return {
        "id": raw["id"],
        "name": raw["name"],
        "force": raw.get("force"),
        "level": raw["level"],
        "mechanic": raw.get("mechanic"),
        "equipment": raw.get("equipment"),
        "category": raw["category"],
        "primary_muscles": raw.get("primaryMuscles") or [],
        "secondary_muscles": raw.get("secondaryMuscles") or [],
        "instructions": raw.get("instructions") or [],
        "images": raw.get("images") or [],
    }


def main() -> None:
    data = load(sys.argv[1] if len(sys.argv) > 1 else None)
    kept = [convert(e) for e in data if e.get("category") not in EXCLUDED_CATEGORIES]
    kept.sort(key=lambda e: e["id"])
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(kept, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"Wrote {len(kept)} exercises ({len(data) - len(kept)} excluded) to {OUTPUT}")


if __name__ == "__main__":
    main()
