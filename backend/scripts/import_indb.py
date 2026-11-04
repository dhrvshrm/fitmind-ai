"""Build the app's Indian food dataset from the Indian Nutrient Databank (INDB).

INDB (Vijayakumar et al., Current Developments in Nutrition, 2024) lists
1,014 standard Indian recipes with nutrients per 100 g and per serving.
Source data: https://github.com/lindsayjaacks/Indian-Nutrient-Databank-INDB-

Usage (from backend/, with the dev requirements installed):
    python scripts/import_indb.py <folder containing INDB.xlsx>

Writes app/nutrition/data/indb_foods.json. Per-100 g values are taken as
published. Serving weights are derived from the per-serving energy and kept
only when plausible for the unit; otherwise the unit's household default is
used and the serving is marked as estimated.
"""
import json
import re
import sys
from pathlib import Path

import openpyxl

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.nutrition.units import default_grams, normalize_unit, plausible_serving  # noqa: E402

OUTPUT = Path(__file__).resolve().parents[1] / "app" / "nutrition" / "data" / "indb_foods.json"

# INDB's recipe totals include all of the oil used for deep frying, so fried
# items (poori, pakora, vada...) come out at 70-90 g fat per 100 g, roughly
# pure oil. Entries above this are excluded rather than shown as verified;
# those dishes fall back to a clearly labelled AI estimate instead.
MAX_FAT_PER_100G = 35.0
# Foods that genuinely are mostly fat and should be kept.
HIGH_FAT_ALLOWED = ("mayonnaise", "dressing")

NUTRIENT_COLUMNS = {
    "kcal": "energy_kcal",
    "protein": "protein_g",
    "carbs": "carb_g",
    "fat": "fat_g",
    "fiber": "fibre_g",
}


def _expand_slashes(phrase: str) -> list:
    """Expand "Potato parantha/paratha" into both spellings.

    A single word after a slash replaces the previous phrase's last word;
    a multi-word part is a separate alternative ("Dahi bhaat/Dahi chawal").
    """
    parts = [p.strip() for p in phrase.split("/") if p.strip()]
    if not parts:
        return []
    names = [parts[0]]
    for part in parts[1:]:
        if " " in part:
            names.append(part)
        else:
            stem = names[-1].rsplit(" ", 1)
            names.append(f"{stem[0]} {part}" if len(stem) == 2 else part)
    return names


def _names(food_name: str) -> list:
    """Return the display name followed by alias spellings (deduplicated)."""
    match = re.match(r"^(.*?)\s*\((.*)\)\s*$", food_name)
    base, extra = (match.group(1), match.group(2)) if match else (food_name, "")
    aliases = _expand_slashes(base) + _expand_slashes(extra)
    seen, unique = set(), []
    for alias in aliases:
        key = alias.lower()
        if key not in seen:
            seen.add(key)
            unique.append(alias)
    return unique


def _energy_consistent(per_100g: dict) -> bool:
    """True if stated kcal roughly matches 4/4/9 kcal per gram of protein/carbs/fat.

    Some soups in the source list macros worth ~170 kcal against 30 kcal of
    energy, so at least one of the numbers is wrong and the entry can't be trusted.
    """
    from_macros = 4 * per_100g["protein"] + 4 * per_100g["carbs"] + 9 * per_100g["fat"]
    return abs(per_100g["kcal"] - from_macros) <= 0.25 * per_100g["kcal"] + 15


def _num(value) -> float:
    """Coerce a spreadsheet cell to a rounded float (blank or text -> 0)."""
    try:
        return round(float(value), 2)
    except (TypeError, ValueError):
        return 0.0


def build(source_dir: Path) -> list:
    workbook = openpyxl.load_workbook(source_dir / "INDB.xlsx", read_only=True)
    rows = list(workbook.worksheets[0].iter_rows(values_only=True))
    index = {name: i for i, name in enumerate(rows[0])}

    foods, excluded, inconsistent = [], [], []
    for row in rows[1:]:
        name = str(row[index["food_name"]] or "").strip()
        if not name:
            continue
        per_100g = {key: _num(row[index[col]]) for key, col in NUTRIENT_COLUMNS.items()}
        if per_100g["kcal"] <= 0:
            continue  # Spice mixes and stocks with no usable energy value.
        if per_100g["fat"] > MAX_FAT_PER_100G and not any(
            word in name.lower() for word in HIGH_FAT_ALLOWED
        ):
            excluded.append(name)
            continue
        if not _energy_consistent(per_100g):
            inconsistent.append(name)
            continue

        unit = normalize_unit(str(row[index["servings_unit"]] or "")) or "bowl"
        serving_kcal = _num(row[index["unit_serving_energy_kcal"]])
        derived = round(serving_kcal / per_100g["kcal"] * 100, 1) if serving_kcal else 0
        reliable = plausible_serving(unit, derived)
        names = _names(name)
        foods.append(
            {
                "id": f"indb:{row[index['food_code']]}",
                "name": names[0] if names else name,
                "full_name": name,
                "aliases": names[1:],
                "source": "INDB",
                "per_100g": per_100g,
                "serving": {
                    "unit": unit,
                    "grams": derived if reliable else default_grams(unit),
                    "from_source": reliable,
                },
            }
        )
    print(f"Excluded {len(excluded)} entries with implausible fat (frying oil counted in full)")
    print(f"Excluded {len(inconsistent)} entries whose energy doesn't match their macros")
    return foods


def main() -> None:
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    foods = build(Path(sys.argv[1]))
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(foods, ensure_ascii=False, indent=1), encoding="utf-8")
    estimated = sum(1 for f in foods if not f["serving"]["from_source"])
    print(f"Wrote {len(foods)} foods to {OUTPUT} ({estimated} with default serving weights)")


if __name__ == "__main__":
    main()
