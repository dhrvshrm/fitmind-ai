"""Build the basic-ingredients dataset from USDA FoodData Central (public domain, CC0).

INDB covers prepared Indian dishes but not plain staples like curd, milk,
eggs, fruit or bread. This script reads them from the SR Legacy bulk
download, which needs no API key:

    https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_csv_2018-04.zip

Usage (from backend/):
    python scripts/import_usda_basics.py <path to the downloaded zip>

Each staple is pinned to an exact FDC id (looked up once by description),
so the data can't silently drift to a different food. Writes
app/nutrition/data/usda_basics.json.
Data source credit: USDA FoodData Central, https://fdc.nal.usda.gov/
"""
import csv
import io
import json
import sys
import zipfile
from pathlib import Path

OUTPUT = Path(__file__).resolve().parents[1] / "app" / "nutrition" / "data" / "usda_basics.json"
FOLDER = "FoodData_Central_sr_legacy_food_csv_2018-04/"

# FDC nutrient ids for the values the app tracks.
NUTRIENT_IDS = {"1008": "kcal", "1003": "protein", "1005": "carbs", "1004": "fat", "1079": "fiber"}

# (FDC id, display name, aliases, serving unit, grams per serving)
STAPLES = [
    (171284, "Curd (plain yogurt, whole milk)", ["curd", "dahi", "yogurt", "plain curd", "plain dahi"], "bowl", 150),
    (171265, "Milk (whole)", ["milk", "doodh", "full cream milk", "full fat milk"], "glass", 250),
    (171267, "Milk (toned, 2% fat)", ["toned milk", "low fat milk"], "glass", 250),
    # Not included: SR Legacy's buttermilk is the thicker American cultured kind;
    # Indian chaas is diluted, so it's left to a labelled AI estimate.
    (173424, "Egg (boiled)", ["boiled egg", "egg", "hard boiled egg"], "egg", 50),
    (172183, "Egg white", ["egg white"], "egg", 33),
    (173944, "Banana", ["banana", "kela"], "piece", 118),
    (171688, "Apple", ["apple", "seb"], "piece", 180),
    (169097, "Orange", ["orange", "santra"], "piece", 130),
    (169910, "Mango", ["mango", "aam"], "piece", 200),
    (169926, "Papaya", ["papaya", "papita"], "bowl", 145),
    (171477, "Chicken breast (roasted)", ["chicken breast", "grilled chicken", "boiled chicken"], "piece", 120),
    (174924, "White bread", ["bread", "white bread", "bread slice"], "slice", 30),
    (172796, "Pav (bread roll)", ["pav", "ladi pav", "bun", "bread roll"], "piece", 40),
    (172688, "Brown bread (whole wheat)", ["brown bread", "whole wheat bread", "atta bread"], "slice", 30),
    (173410, "Butter", ["butter", "makhan", "amul butter"], "tsp", 5),
    (173412, "Ghee", ["ghee", "clarified butter", "desi ghee"], "tsp", 5),
    (171411, "Cooking oil", ["oil", "vegetable oil", "refined oil", "cooking oil"], "tsp", 5),
    (173806, "Peanuts (roasted)", ["peanuts", "moongphali", "groundnuts"], "tbsp", 15),
    (170567, "Almonds", ["almonds", "badam"], "piece", 1.2),
    (170162, "Cashews", ["cashews", "kaju"], "piece", 1.5),
    (173904, "Oats (dry)", ["oats", "rolled oats"], "cup", 40),
    (169655, "Sugar", ["sugar", "cheeni"], "tsp", 4),
    (169640, "Honey", ["honey", "shahad"], "tsp", 7),
    (170853, "Cheese slice (processed)", ["cheese", "cheese slice"], "slice", 20),
    (172475, "Tofu (firm)", ["tofu"], "piece", 80),
    (168878, "White rice (cooked)", ["white rice", "steamed rice", "cooked rice"], "bowl", 150),
    (173757, "Chickpeas (boiled)", ["boiled chana", "boiled chickpeas", "kabuli chana"], "bowl", 150),
    (172421, "Lentils (boiled)", ["boiled lentils", "boiled masoor"], "bowl", 150),
    (172470, "Peanut butter", ["peanut butter"], "tbsp", 16),
    (170273, "Dark chocolate (70-85%)", ["dark chocolate"], "piece", 10),
    (168409, "Cucumber", ["cucumber", "kheera"], "piece", 200),
    (170457, "Tomato", ["tomato", "tamatar"], "piece", 120),
]


def main() -> None:
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    wanted = {str(fdc_id): rest for fdc_id, *rest in STAPLES}
    archive = zipfile.ZipFile(sys.argv[1])

    def rows(name):
        return csv.DictReader(io.TextIOWrapper(archive.open(FOLDER + name), encoding="utf-8"))

    descriptions = {r["fdc_id"]: r["description"] for r in rows("food.csv") if r["fdc_id"] in wanted}
    missing = set(wanted) - set(descriptions)
    if missing:
        sys.exit(f"FDC ids not found in this download: {sorted(missing)}")

    nutrients = {fdc_id: {key: 0.0 for key in NUTRIENT_IDS.values()} for fdc_id in wanted}
    for row in rows("food_nutrient.csv"):
        key = NUTRIENT_IDS.get(row["nutrient_id"])
        if key and row["fdc_id"] in wanted:
            nutrients[row["fdc_id"]][key] = round(float(row["amount"]), 2)

    foods = []
    for fdc_id, name, aliases, unit, grams in STAPLES:
        foods.append(
            {
                "id": f"usda:{fdc_id}",
                "name": name,
                "full_name": descriptions[str(fdc_id)],
                "aliases": aliases,
                "source": "USDA",
                "per_100g": nutrients[str(fdc_id)],
                "serving": {"unit": unit, "grams": grams, "from_source": False},
            }
        )
        print(f"{name:32} <- {descriptions[str(fdc_id)]} (fdc {fdc_id})")
    OUTPUT.write_text(json.dumps(foods, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"Wrote {len(foods)} foods to {OUTPUT}")


if __name__ == "__main__":
    main()
