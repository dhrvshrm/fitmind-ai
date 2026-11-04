# Food Data Sources

FitMind calculates nutrition from published food composition data first and
uses AI only for foods the data doesn't cover. Every food in the app shows
where its numbers came from.

## Indian Nutrient Databank (INDB)

- Vijayakumar A., et al. "Development of an Indian Food Composition Database."
  *Current Developments in Nutrition* 8(7), 2024. https://pmc.ncbi.nlm.nih.gov/articles/PMC11277795/
- Data: https://github.com/lindsayjaacks/Indian-Nutrient-Databank-INDB-
- Coverage: 1,014 standard Indian recipes with nutrients per 100 g and per serving.
- Built into `backend/app/nutrition/data/indb_foods.json` by `backend/scripts/import_indb.py`.

The paper describes INDB as open access and is published under CC BY 4.0. The
data repository has no license file, so terms for commercial use should be
confirmed with the authors before FitMind serves real users.

### What the import changes

The import keeps INDB's per-100 g values as published and removes entries that
can't be trusted:

| Removed | Count | Why |
|---|---|---|
| Fat above 35 g per 100 g (except mayonnaise and dressings) | 128 | Recipe totals count all of the oil used for deep frying, so poori, pakora, vada and similar items come out at 70 to 90 g fat per 100 g, which is roughly pure oil. |
| Energy that doesn't match the macros | 32 | Stated kcal differs from 4/4/9 kcal per gram of protein, carbs and fat by more than 25%. Mostly soups, where at least one value is wrong. |
| No energy value | a few | Spice mixes and stocks. |

854 foods remain. Removed dishes fall back to an AI estimate, which is labelled as such.

Serving weights are derived from INDB's per-serving energy. A derived weight is
kept only if it is believable for its unit (for example, a bowl between 30 and
250 g). Otherwise the household default is used: 1 bowl or katori is 150 g,
1 plate is 250 g, 1 glass is 250 ml, and so on (`backend/app/nutrition/units.py`).
Containers are volumes, so a bowl of poha legitimately weighs less than a bowl of dal.

## USDA FoodData Central

- U.S. Department of Agriculture, Agricultural Research Service. FoodData Central. https://fdc.nal.usda.gov/
- Public domain (CC0 1.0).
- Used for 32 plain staples INDB doesn't list: curd, milk, eggs, fruit, bread, pav, butter, ghee, oil, nuts, oats and similar.
- Built into `backend/app/nutrition/data/usda_basics.json` by `backend/scripts/import_usda_basics.py`
  from the SR Legacy bulk download (no API key needed). Each staple is pinned to an exact FDC id,
  so it can't drift to a different food.
- Left out on purpose: paneer and soya chunks (no faithful equivalent) and buttermilk (the US
  cultured kind is much richer than Indian chaas). These use labelled AI estimates.

## Toppings on breads

"Butter paratha", "ghee roti" or "cheese dosa" is logged as the bread plus the topping as its own
item, at 1 tsp butter or ghee (or 1 cheese slice) per piece. That amount is shown as assumed so the
user can change it. Dishes named after a sauce, like butter chicken, are kept whole.

## AI estimates

Foods in neither dataset are estimated by the AI layer. Estimates:

- are validated: energy must roughly match protein, carbs and fat, and amounts must be in sensible ranges;
- are labelled "AI estimate" in the app and stored with source `ai_estimate`;
- are never shown as verified.

If AI is unavailable, the food is marked "Needs values" and the user enters the numbers.

## Checking accuracy

`backend/evals/indian_meals.json` holds 40 common Indian meals with typical
calorie ranges. `backend/scripts/eval_meal_estimates.py` runs them through the
real estimator (AI keys required) and reports which fall outside their range.
