"""Fasting and festival modes: switch on for chosen dates, find today's, warn on logging.

Dates are always the user's choice (festival dates depend on the local
calendar and moon sighting, so the app never guesses them). The active mode's
food rules are applied through ``DietRules.with_fasting_mode`` wherever the
person's diet rules are used (see app/nutrition/fasting.py).
"""
import logging
from datetime import date, timedelta
from typing import Any, Dict, List, Optional

from app.models import audit, fasting_mode
from app.nutrition import fasting, food_db
from app.nutrition.diet_rules import DietRules
from app.nutrition.food_db import Food, Nutrients, Serving
from app.utils.time import local_today

logger = logging.getLogger(__name__)

# How far ahead a mode can be planned.
MAX_DAYS_AHEAD = 366
STATUS_ACTIVE, STATUS_UPCOMING, STATUS_PAST = "active", "upcoming", "past"


class FastingModeError(Exception):
    """A mode request that can't be completed; ``kind`` maps to the HTTP status."""

    def __init__(self, message: str, kind: str = "invalid"):
        super().__init__(message)
        self.kind = kind


def _status(mode: dict, today: str) -> str:
    if mode["end_date"] < today:
        return STATUS_PAST
    return STATUS_ACTIVE if mode["start_date"] <= today else STATUS_UPCOMING


def _public(mode: dict, today: str) -> dict:
    data = {k: v for k, v in mode.items() if k not in ("user_id", "_id", "created_at")}
    data["status"] = _status(mode, today)
    data["timing"] = fasting.MODES[mode["mode"]].timing
    return data


async def list_modes(user_id: str) -> Dict[str, Any]:
    """The modes on offer, the user's current and upcoming modes, and today's active one."""
    today = local_today().isoformat()
    modes = [_public(m, today) for m in await fasting_mode.list_for_user(user_id)]
    current = [m for m in modes if m["status"] != STATUS_PAST]
    return {
        "catalogue": fasting.catalogue(),
        "modes": current,
        "active": next((m for m in current if m["status"] == STATUS_ACTIVE), None),
    }


async def active_mode(user_id: str) -> Optional[dict]:
    """The mode covering the user's today, or None. Shape: ``{"id", "mode",
    "start_date", "end_date", "dawn_time"?, "sunset_time"?}``."""
    today = local_today().isoformat()
    for mode in await fasting_mode.list_for_user(user_id):
        if mode["start_date"] <= today <= mode["end_date"]:
            return {k: v for k, v in mode.items() if k not in ("user_id", "_id", "created_at")}
    return None


async def create_mode(user_id: str, data: Dict[str, Any]) -> dict:
    """Switch a mode on for the given dates.

    Raises:
        FastingModeError: if the dates are in the past, too long or too far
            ahead, or overlap a mode already set.
    """
    spec = fasting.MODES[data["mode"]]
    start: date = data["start_date"]
    end: date = data.get("end_date") or start + timedelta(days=spec.usual_days - 1)
    today = local_today()
    if end < today:
        raise FastingModeError("Those dates have already passed")
    if start > today + timedelta(days=MAX_DAYS_AHEAD):
        raise FastingModeError("Pick dates within the next year")
    length = (end - start).days + 1
    if length > spec.max_days:
        if spec.single_day:
            raise FastingModeError("This fast is a single day. Add each one separately")
        raise FastingModeError(f"This mode can last up to {spec.max_days} days")
    start_iso, end_iso = start.isoformat(), end.isoformat()
    for other in await fasting_mode.list_for_user(user_id):
        if other["start_date"] <= end_iso and start_iso <= other["end_date"]:
            raise FastingModeError("These dates overlap another fasting mode. Remove that one first")
    fields: Dict[str, Any] = {"mode": spec.key, "start_date": start_iso, "end_date": end_iso}
    if spec.timing == fasting.TIMING_RAMADAN:
        fields["dawn_time"] = data.get("dawn_time") or fasting.DEFAULT_DAWN
        fields["sunset_time"] = data.get("sunset_time") or fasting.DEFAULT_SUNSET
        fields["times_given"] = bool(data.get("dawn_time") and data.get("sunset_time"))
    doc = await fasting_mode.create(user_id, fields)
    await audit.record_change(user_id, "fasting_mode", "created", after=fields, entity_id=doc["id"])
    return _public(doc, today.isoformat())


async def delete_mode(user_id: str, mode_id: str) -> None:
    """Switch a mode off (or remove an upcoming one).

    Raises:
        FastingModeError: if the user has no such mode.
    """
    if not await fasting_mode.delete(user_id, mode_id):
        raise FastingModeError("Fasting mode not found", "not_found")
    await audit.record_change(user_id, "fasting_mode", "deleted", entity_id=mode_id)


def _item_food(item: Dict[str, Any]) -> Food:
    """A food to check by name: the dataset food when known, else the logged name."""
    found = food_db.get_food(item["food_id"]) if item.get("food_id") else None
    return found or Food(
        id="logged", name=item.get("name") or "", source="logged",
        per_100g=Nutrients(), serving=Serving(unit="serving", grams=100),
    )


def breaking_foods(mode: Optional[dict], items: List[Dict[str, Any]], meal_name: str = "") -> List[str]:
    """Names of logged foods that don't fit ``mode``'s food rules (empty if all fit).

    ``items`` are meal items (``name`` and optionally ``food_id``); without
    items the meal name is checked. Ramadan has no food rules, so nothing is
    flagged (its fast is about time of day, which logging doesn't judge).
    """
    spec = fasting.get_mode((mode or {}).get("mode"))
    if spec is None or not spec.restricts_food:
        return []
    rules = DietRules(spec.forbidden_tags, [], spec)
    foods = [_item_food(i) for i in items] or [_item_food({"name": meal_name})]
    return [f.name for f in foods if f.name and not rules.allows(f)]


async def meal_warning(user_id: str, items: List[Dict[str, Any]], meal_name: str = "",
                       log_date: Optional[str] = None) -> Optional[dict]:
    """A gentle note when a logged meal breaks today's fast; never blocks logging.

    Returns ``{"mode", "foods": [names], "end_date"}`` or None.
    """
    mode = await active_mode(user_id)
    if mode is None or (log_date and not mode["start_date"] <= log_date <= mode["end_date"]):
        return None
    foods = breaking_foods(mode, items, meal_name)
    if not foods:
        return None
    return {"mode": mode["mode"], "foods": foods, "end_date": mode["end_date"]}


async def meals_warning(user_id: str, meals: List[Dict[str, Any]]) -> Optional[dict]:
    """``meal_warning`` for several logged meals (``public_dict`` shape), combined."""
    mode = await active_mode(user_id)
    if mode is None:
        return None
    foods: List[str] = []
    for meal in meals:
        if meal.get("date") and not mode["start_date"] <= meal["date"] <= mode["end_date"]:
            continue
        foods += [f for f in breaking_foods(mode, meal.get("items") or [], meal.get("name", "")) if f not in foods]
    return {"mode": mode["mode"], "foods": foods, "end_date": mode["end_date"]} if foods else None
