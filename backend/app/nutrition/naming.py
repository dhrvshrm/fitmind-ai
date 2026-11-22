"""Short meal names ("Poha and chai") instead of the whole description.

Mirrors ``conciseMealName`` in frontend/src/utils/nutrition.ts.
"""
import re
from typing import Any, Dict, List

# Foods with almost no calories (water, black tea) are left out of the name.
MIN_KCAL_IN_NAME = 10
MAX_FOODS_IN_NAME = 3


def _label(item: Dict[str, Any]) -> str:
    """The person's own word for the food ("chai"), else the dataset name, without brackets."""
    raw = (item.get("query") or item.get("name") or "").strip()
    raw = re.sub(r"\s*\(.*?\)", "", raw).strip()
    return raw[:1].upper() + raw[1:] if raw else ""


def concise_meal_name(items: List[Dict[str, Any]]) -> str:
    """The main foods of a meal, at most the three heaviest, in eating order: "Rajma, rice and salad"."""
    def kcal(item: Dict[str, Any]) -> float:
        return float((item.get("nutrients") or {}).get("kcal") or 0)

    labelled = [(kcal(i), index, _label(i)) for index, i in enumerate(items) if _label(i)]
    main = [x for x in labelled if x[0] >= MIN_KCAL_IN_NAME] or labelled
    unique: List[tuple] = []
    for entry in main:
        if entry[2].lower() not in (u[2].lower() for u in unique):
            unique.append(entry)
    if not unique:
        return "Meal"
    names = [u[2] for u in unique]
    # The heaviest foods make the name, in the order they were eaten or said.
    picked = sorted(sorted(unique, key=lambda x: -x[0])[:MAX_FOODS_IN_NAME], key=lambda x: x[1])
    shown = [p[2] for p in picked]
    shown = [shown[0]] + [n[:1].lower() + n[1:] for n in shown[1:]]
    rest = len(names) - len(shown)
    if rest:
        return f"{', '.join(shown)} and {rest} more"
    if len(shown) == 1:
        return shown[0]
    return f"{', '.join(shown[:-1])} and {shown[-1]}"
