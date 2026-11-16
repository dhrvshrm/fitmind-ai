"""Supplements: the curated catalogue, personal safety notes, and daily tracking.

The catalogue (app/health/data/supplements.json) is curated from NIH ODS fact
sheets, ISSN position stands and FSSAI regulations. Safety flags and reasons
come from rules (app/health/supplement_rules.py) using only health data the
user consented to share. The app never prescribes: it says what's commonly
used and suggests discussing it with a doctor.

Protein powders add their macros to the day's nutrition when ticked off, as a
logged snack whose item says it came from a supplement.
"""
import json
import logging
import re
from datetime import datetime, timedelta
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field, model_validator

from app.health import supplement_rules
from app.models import audit
from app.models import supplement as model
from app.models.nutrition import Meal
from app.models.user import User
from app.services import consent_service, health_profile_service
from app.services.consent_service import SCOPE_HEALTH_REPORTS
from app.utils.time import local_now, local_today, local_today_iso, use_timezone

logger = logging.getLogger(__name__)

CATALOG_PATH = Path(__file__).resolve().parent.parent / "health" / "data" / "supplements.json"
CUSTOM_ID = "custom"
MAX_SUPPLEMENTS = 30
HISTORY_DAYS = 14
# Default reminder times (local) for timings tied to a time of day. Pre/post
# workout and "any" only remind when the user sets a time.
DEFAULT_REMINDER_TIMES = {
    "morning": "08:00",
    "with_breakfast": "08:30",
    "with_lunch": "13:00",
    "with_dinner": "20:00",
    "evening": "19:00",
    "bedtime": "22:00",
}
REMINDER_WINDOW_MINUTES = 60


class SupplementError(Exception):
    """A supplement request that can't be completed; ``kind`` maps to the HTTP status."""

    def __init__(self, message: str, kind: str = "invalid"):
        super().__init__(message)
        self.kind = kind


@lru_cache(maxsize=1)
def _catalog() -> Dict[str, Any]:
    with open(CATALOG_PATH, encoding="utf-8") as f:
        return json.load(f)


def catalog_entries() -> List[dict]:
    return list(_catalog()["supplements"])


def catalog_entry(supplement_id: str) -> Optional[dict]:
    return next((s for s in _catalog()["supplements"] if s["id"] == supplement_id), None)


def _normal(text: str) -> str:
    return " " + re.sub(r"[^a-z0-9]+", " ", text.lower()).strip() + " "


def _is_blocked(name: str) -> bool:
    """Steroids, hormones, SARMs and drugs are never tracked.

    Whole words only, so "clen" blocks clenbuterol talk but "strength" or
    "trend" never trip a short word.
    """
    text = _normal(name)
    return any(_normal(word) in text for word in _catalog()["blocked"])


async def _context(user: User) -> Dict[str, Any]:
    """Everything the rules need about a user, from consented data only."""
    flags = await health_profile_service.health_flags(user.id)
    latest: Dict[str, dict] = {}
    if await consent_service.has_consent(user.id, SCOPE_HEALTH_REPORTS):
        from app.services import lab_report_service

        latest = await lab_report_service.latest_values(user.id)
    return {
        "flags": flags,
        "latest": latest,
        "intake": await _recent_protein(user.id),
        "activity": user.activity_level,
        "prefs": user.food_preferences or {},
        "goal": user.fitness_goal,
        "targets": user.targets,
        "age": user.age,
        "workout_days": user.workout_days_per_week,
        "trains": bool(user.workout_days_per_week),
    }


# Recent eating, for "do you actually need protein powder": days with at least
# this many meals in the last week (today excluded, it isn't over yet).
INTAKE_DAYS = 7
INTAKE_MIN_MEALS = 2
INTAKE_MIN_DAYS = 3


async def _recent_protein(user_id: str) -> Optional[Dict[str, float]]:
    """Average logged protein on recent full days, or None without enough logging."""
    from app.services import nutrition_service

    today = local_today()
    start = (today - timedelta(days=INTAKE_DAYS)).isoformat()
    days = [d for d in await nutrition_service.get_nutrition_history(user_id, INTAKE_DAYS * 2)
            if start <= d["date"] < today.isoformat() and d["meals_logged"] >= INTAKE_MIN_MEALS]
    if len(days) < INTAKE_MIN_DAYS:
        return None
    return {"avg_protein": sum(d["protein"] for d in days) / len(days), "days": len(days)}


def _personalise(entry: dict, ctx: Dict[str, Any]) -> dict:
    macros = entry.get("macros_per_serving") or {}
    flags = supplement_rules.safety_flags(entry["id"], ctx["flags"], ctx["prefs"], ctx["age"])
    why = supplement_rules.reasons(
        entry["id"], ctx["flags"], ctx["prefs"], ctx["goal"], ctx["targets"], ctx["latest"],
        ctx["workout_days"], macros.get("protein"), ctx["intake"], ctx["activity"],
    )
    timing, timing_reason = supplement_rules.suggested_timing(entry["id"], ctx.get("trains", False))
    return {
        **entry,
        "safety_flags": flags,
        "reasons": why,
        "relevant": bool(why),
        "doctor_first": any(f["severity"] == supplement_rules.DOCTOR_FIRST for f in flags),
        "suggested_timing": timing,
        "timing_reason": timing_reason,
    }


async def personalised_catalog(user_id: str) -> Dict[str, Any]:
    """The catalogue with safety notes and reasons for this user, relevant first."""
    user = await _user(user_id)
    ctx = await _context(user)
    entries = [_personalise(e, ctx) for e in catalog_entries()]
    entries.sort(key=lambda e: (not e["relevant"], e["name"]))
    return {"version": _catalog()["version"], "reviewed": _catalog()["reviewed"], "supplements": entries}


async def supplement_info(supplement_id: str, user: User) -> Optional[dict]:
    """One catalogue entry personalised for ``user`` (None if unknown). For the coach."""
    entry = catalog_entry(supplement_id)
    if entry is None:
        return None
    return _personalise(entry, await _context(user))


async def _user(user_id: str) -> User:
    user = await User.get_by_id(user_id)
    if user is None:
        raise SupplementError("User not found", "not_found")
    return user


# ---------------------------------------------------------------------------
# Tracking
# ---------------------------------------------------------------------------
def _present(item: dict, taken_today: bool) -> dict:
    entry = catalog_entry(item.get("supplement_id") or "")
    return {
        **{k: v for k, v in item.items() if k != "user_id"},
        "taken_today": taken_today,
        "category": entry["category"] if entry else CUSTOM_ID,
        "adds_to_nutrition": bool(item.get("macros_per_serving")),
    }


async def list_user_supplements(user_id: str) -> List[dict]:
    """The user's active supplements with whether each was taken today. For the coach."""
    items = await model.list_active(user_id)
    today = local_today_iso()
    taken = {log["user_supplement_id"] for log in await model.logs_for_dates(user_id, [today])}
    return [_present(item, item["id"] in taken) for item in items]


async def add_supplement(user_id: str, data: Dict[str, Any]) -> dict:
    """Start tracking a supplement (from the catalogue, or a custom one).

    Raises:
        SupplementError: for an unknown catalogue id, a missing or blocked
            custom name, or too many supplements.
    """
    supplement_id = data.get("supplement_id")
    entry = catalog_entry(supplement_id) if supplement_id else None
    if supplement_id and entry is None:
        raise SupplementError("Unknown supplement", "not_found")
    name = (data.get("name") or "").strip() or (entry["name"] if entry else "")
    if not name:
        raise SupplementError("Give the supplement a name")
    if _is_blocked(name):
        raise SupplementError(
            "RepEat only tracks everyday supplements. Steroids, hormones, SARMs, fat burners and "
            "weight-loss drugs can seriously harm your body; please talk to a doctor instead"
        )
    if len(await model.list_active(user_id)) >= MAX_SUPPLEMENTS:
        raise SupplementError(f"You can track up to {MAX_SUPPLEMENTS} supplements")
    macros = data.get("macros_per_serving")
    if macros is None and entry and entry.get("macros_per_serving"):
        m = entry["macros_per_serving"]
        macros = {k: m[k] for k in ("calories", "protein", "carbs", "fats")}
    timing = data.get("timing") or "any"
    if timing == "any" and entry:
        timing = entry.get("default_timing", "any")
    item = await model.create(user_id, {
        "supplement_id": entry["id"] if entry else CUSTOM_ID,
        "name": name[:80],
        "dose": (data.get("dose") or "").strip(),
        "timing": timing,
        "reminder_time": data.get("reminder_time") or None,
        "macros_per_serving": macros,
        "notes": data.get("notes"),
    })
    await audit.record_change(user_id, "supplement", "create", after={"name": item["name"]}, entity_id=item["id"])
    return _present(item, False)


async def update_supplement(user_id: str, supplement_id: str, changes: Dict[str, Any]) -> dict:
    item = await model.get(user_id, supplement_id)
    if item is None:
        raise SupplementError("Supplement not found", "not_found")
    fields = {k: v for k, v in changes.items() if v is not None}
    if fields.get("reminder_time") == "":
        fields["reminder_time"] = None
    await model.update(user_id, supplement_id, fields)
    await audit.record_change(user_id, "supplement", "update", before=item, after={**item, **fields},
                              entity_id=supplement_id)
    updated = await model.get(user_id, supplement_id)
    taken = await model.get_log(user_id, supplement_id, local_today_iso()) is not None
    return _present(updated, taken)


async def remove_supplement(user_id: str, supplement_id: str) -> None:
    if not await model.delete(user_id, supplement_id):
        raise SupplementError("Supplement not found", "not_found")
    await audit.record_change(user_id, "supplement", "delete", before={"id": supplement_id}, after={},
                              entity_id=supplement_id)


async def _log_protein_meal(user_id: str, item: dict) -> Optional[str]:
    """Add a protein powder serving to today's nutrition. Returns the meal id."""
    macros = item.get("macros_per_serving")
    if not macros:
        return None
    nutrients = {
        "kcal": macros.get("calories", 0), "protein": macros.get("protein", 0),
        "carbs": macros.get("carbs", 0), "fat": macros.get("fats", 0), "fiber": 0,
    }
    meal = Meal(
        user_id,
        item["name"],
        nutrients["kcal"],
        nutrients["protein"],
        nutrients["carbs"],
        nutrients["fat"],
        meal_type="snack",
        eaten_at=local_now().strftime("%H:%M"),
        items=[{
            "name": item["name"],
            "food_id": None,
            "source": "manual",
            "verified": False,
            "quantity": 1,
            "unit": "serving",
            "grams": 0,
            "nutrients": nutrients,
            "edited": False,
            # Provenance: this item was logged by ticking off a supplement.
            "provenance": "supplement",
            "user_supplement_id": item["id"],
        }],
        source="manual",
    )
    await meal.save()
    return meal.id


async def mark_taken(user_id: str, supplement_id: str) -> dict:
    """Tick a supplement off for today (idempotent). Protein powders log their macros."""
    item = await model.get(user_id, supplement_id)
    if item is None:
        raise SupplementError("Supplement not found", "not_found")
    today = local_today_iso()
    if await model.get_log(user_id, supplement_id, today) is None:
        meal_id = await _log_protein_meal(user_id, item)
        await model.add_log(user_id, supplement_id, today, meal_id)
    return _present(item, True)


async def mark_not_taken(user_id: str, supplement_id: str) -> dict:
    """Undo today's tick, removing any nutrition it added."""
    item = await model.get(user_id, supplement_id)
    if item is None:
        raise SupplementError("Supplement not found", "not_found")
    log = await model.get_log(user_id, supplement_id, local_today_iso())
    if log:
        if log.get("meal_id"):
            meal = await Meal.get_for_user(user_id, log["meal_id"])
            if meal is not None:
                await meal.delete()
        await model.delete_log(user_id, log["id"])
    return _present(item, False)


async def history(user_id: str, days: int = HISTORY_DAYS) -> List[dict]:
    """Per day for the last ``days`` days: how many of today's supplements were taken."""
    today = local_today()
    dates = [(today - timedelta(days=offset)).isoformat() for offset in range(days - 1, -1, -1)]
    logs = await model.logs_for_dates(user_id, dates)
    active = {item["id"] for item in await model.list_active(user_id)}
    by_date: Dict[str, set] = {d: set() for d in dates}
    for log in logs:
        if log["user_supplement_id"] in active:
            by_date[log["local_date"]].add(log["user_supplement_id"])
    return [{"date": d, "taken": len(by_date[d]), "total": len(active)} for d in dates]


# ---------------------------------------------------------------------------
# Reminders (sent by the push sender, which owns delivery and de-duplication)
# ---------------------------------------------------------------------------
def _reminder_time(item: dict) -> Optional[str]:
    return item.get("reminder_time") or DEFAULT_REMINDER_TIMES.get(item.get("timing") or "")


async def due_supplement_reminders(user: User, now: datetime,
                                   window_minutes: int = REMINDER_WINDOW_MINUTES) -> List[dict]:
    """Supplements whose reminder time passed in the last ``window_minutes`` and
    that haven't been ticked off today, in the user's own timezone.

    ``now`` must be timezone-aware. Each item has ``key`` (stable per supplement
    and day, for de-duplicating sends), ``title``, ``body`` and ``url``.
    """
    with use_timezone(user.timezone):
        local = now.astimezone(local_now().tzinfo)
        today = local.date().isoformat()
        items = await model.list_active(user.id)
        taken = {log["user_supplement_id"] for log in await model.logs_for_dates(user.id, [today])}
    due = []
    for item in items:
        at = _reminder_time(item)
        if not at or item["id"] in taken:
            continue
        hour, minute = (int(x) for x in at.split(":"))
        scheduled = local.replace(hour=hour, minute=minute, second=0, microsecond=0)
        if scheduled <= local < scheduled + timedelta(minutes=window_minutes):
            dose = f" ({item['dose']})" if item.get("dose") else ""
            due.append({
                "key": f"supplement:{item['id']}:{today}",
                "user_supplement_id": item["id"],
                "name": item["name"],
                "dose": item.get("dose") or "",
                "scheduled_for": scheduled.isoformat(),
                "title": "Supplement reminder",
                "body": f"Time for your {item['name']}{dose}. Tick it off when you've taken it.",
                "url": "/health?tab=supplements",
            })
    return due



# ---------------------------------------------------------------------------
# Essentials: the bare minimum for this person, within their budget
# ---------------------------------------------------------------------------
MAX_ESSENTIALS = 3
# Order when several fit: a confirmed deficiency first, then cheap with strong
# evidence, then expensive ones (protein powder only when meals fall short).
ESSENTIAL_ORDER = ["creatine_monohydrate", "vitamin_d3", "vitamin_b12", "whey_protein", "plant_protein",
                   "omega_3", "magnesium", "calcium", "electrolytes", "iron", "multivitamin"]
# Training aids and herbs are never "essential".
NOT_ESSENTIAL = {"caffeine", "ashwagandha"}


def _is_india(country: Optional[str]) -> bool:
    return (country or "India").strip().lower() in ("india", "in", "bharat")


def _essential_item(entry: dict, india: bool) -> dict:
    return {
        "id": entry["id"],
        "name": entry["name"],
        "why": entry["reasons"][0] if entry["reasons"] else "",
        "default_dose": entry.get("default_dose", ""),
        "monthly_cost_inr": entry.get("monthly_cost_inr", 0),
        "india_gap": entry.get("india_gap") if india else None,
        "food_first": entry.get("food_first", ""),
    }


async def essentials(user_id: str, budget_inr: int) -> Dict[str, Any]:
    """At most three supplements that fit this person and their monthly budget.

    Unbiased by design: no brands, generic types only, nothing that isn't
    relevant to their own body, diet, training or results; food is always
    offered first. Anything needing a doctor's go-ahead is listed apart.
    """
    user = await _user(user_id)
    ctx = await _context(user)
    india = _is_india((user.food_access or {}).get("country"))
    relevant = [_personalise(e, ctx) for e in catalog_entries() if e["id"] not in NOT_ESSENTIAL]
    relevant = [e for e in relevant if e["relevant"]]
    ask_doctor = [e for e in relevant if e["doctor_first"]]
    candidates = [e for e in relevant if not e["doctor_first"]]

    def rank(entry: dict) -> tuple:
        confirmed = any("confirmed" in r for r in entry["reasons"])
        order = ESSENTIAL_ORDER.index(entry["id"]) if entry["id"] in ESSENTIAL_ORDER else len(ESSENTIAL_ORDER)
        return (not confirmed, order)

    picks, later, spent = [], [], 0
    for entry in sorted(candidates, key=rank):
        cost = entry.get("monthly_cost_inr", 0)
        if len(picks) < MAX_ESSENTIALS and spent + cost <= budget_inr:
            picks.append(_essential_item(entry, india))
            spent += cost
        else:
            later.append(_essential_item(entry, india))
    return {
        "budget_inr": budget_inr,
        "india": india,
        "picks": picks,
        "later": later,
        "ask_doctor": [_essential_item(e, india) for e in ask_doctor],
        "total_inr": spent,
    }


# ---------------------------------------------------------------------------
# Label estimate: dose and macros from a product name (AI, checked)
# ---------------------------------------------------------------------------
class LabelEstimate(BaseModel):
    serving_label: str = Field(..., max_length=60)
    serving_g: float = Field(..., ge=0, le=200)
    calories: float = Field(..., ge=0, le=1000)
    protein: float = Field(..., ge=0, le=100)
    carbs: float = Field(..., ge=0, le=150)
    fats: float = Field(..., ge=0, le=60)
    adds_nutrition: bool
    confidence: Literal["high", "medium", "low"]
    note: str = Field("", max_length=200)
    # False when the named product is clearly a different kind of supplement.
    matches_type: bool = True

    @model_validator(mode="after")
    def _consistent(self) -> "LabelEstimate":
        if self.serving_g and self.protein + self.carbs + self.fats > self.serving_g * 1.05:
            raise ValueError("macros weigh more than the serving")
        energy = 4 * self.protein + 4 * self.carbs + 9 * self.fats
        if self.calories > 20 and abs(energy - self.calories) > max(25, self.calories * 0.3):
            raise ValueError("calories don't match the macros")
        return self


TYPED_LABEL_PROMPT = (
    "The person is tracking {kind}. Their product is \"{product}\" (a brand, or a brand and product name), "
    "sold in India. Give the label of that brand's {kind}: one serving as the label states it "
    "(serving_label like '1 scoop (35 g)', '5 g' or '1 capsule'), its weight in grams, and calories, protein, "
    "carbs and fats per serving. {macros_rule} "
    "Set matches_type false only if the named product is clearly a different kind of supplement than {kind} "
    "(say which in note). If you don't know this brand's {kind}, use typical values for {kind} and set "
    "confidence low."
)
CALORIE_FREE_RULE = "It carries no meaningful calories: all macros 0 and adds_nutrition false."
CALORIE_RULE = "adds_nutrition is true: it carries calories and protein."

LABEL_PROMPT = (
    "Estimate the label of this supplement product sold in India: \"{product}\". "
    "Give one serving as the label states it (serving_label like '1 scoop (35 g)' or '1 capsule'), "
    "its weight in grams, and calories, protein, carbs and fats per serving. "
    "adds_nutrition is true only for products that carry real calories (protein powders, gainers). "
    "Vitamins, minerals, creatine and capsules: all macros 0 and adds_nutrition false. "
    "If you don't know this exact product, use typical values for its type and set confidence low."
)


async def estimate_label(user_id: str, product: str, supplement_id: Optional[str] = None) -> dict:
    """Serving and macros for a named product, as an estimate the person can edit.

    Raises:
        SupplementError: for a blocked product (steroids, hormones, drugs).
    """
    product = product.strip()
    if not product:
        raise SupplementError("Type the product name")
    if _is_blocked(product):
        raise SupplementError(
            "RepEat only tracks everyday supplements. Steroids, hormones, SARMs, fat burners and "
            "weight-loss drugs can seriously harm your body; please talk to a doctor instead"
        )
    from app.ai import client as ai_client

    # Read the name as the supplement being tracked: "Wellcore" while adding
    # creatine means Wellcore's creatine, not their whey.
    entry = catalog_entry(supplement_id) if supplement_id else None
    calorie_free = bool(entry) and entry["category"] != "protein"
    if entry:
        prompt = TYPED_LABEL_PROMPT.format(
            kind=entry["name"], product=product[:80],
            macros_rule=CALORIE_FREE_RULE if calorie_free else CALORIE_RULE,
        )
    else:
        prompt = LABEL_PROMPT.format(product=product[:80])
    result = await ai_client.generate_json(
        prompt, LabelEstimate, user_id=user_id, retries=2,
        cache_key=f"supplement-label:{supplement_id or 'any'}:{product.lower()[:80]}",
    )
    data = result.model_dump()
    if calorie_free:
        # Creatine, vitamins and minerals never add calories, whatever the model says.
        data.update(calories=0, protein=0, carbs=0, fats=0, adds_nutrition=False)
    return {**data, "estimated": True, "type_name": entry["name"] if entry else None}



# ---------------------------------------------------------------------------
# Daily routine: everything taken, grouped by when in the person's day
# ---------------------------------------------------------------------------
async def routine(user_id: str) -> Dict[str, Any]:
    """The person's supplements grouped by the plan meal they go with, in day order.

    Each item says if a better time would fold it into a step they already take
    (creatine with the post-workout protein), to save time.
    """
    from app.nutrition import meal_planner, plan_supplements

    user = await _user(user_id)
    items = await list_user_supplements(user_id)
    trains = bool(user.workout_days_per_week)
    meals = meal_planner.plan_slots(user.lifestyle, user.workout_time, trains)
    labels = {"pre_workout": "Before training", "breakfast": "Breakfast", "mid_morning": "Mid-morning",
              "lunch": "Lunch", "evening_snack": "Evening snack", "dinner": "Dinner", "bedtime": "Before bed",
              "sehri": "Sehri", "iftar": "Iftar", "post_iftar": "After iftar"}
    groups: Dict[str, dict] = {}
    for item in items:
        slot = plan_supplements.slot_for(item, meals)
        if slot is None:
            continue
        meal = next(m for m in meals if m["id"] == slot)
        group = groups.setdefault(slot, {
            "slot": slot, "label": labels.get(slot, slot.replace("_", " ").capitalize()),
            "time": meal["time"], "after_training": meal.get("workout_role") == "post", "items": [],
        })
        best, why = supplement_rules.suggested_timing(item.get("supplement_id") or "", trains)
        better = None
        if item.get("supplement_id") != CUSTOM_ID and best != (item.get("timing") or "any"):
            better = {"timing": best, "why": why}
        group["items"].append({"id": item["id"], "name": item["name"], "dose": item.get("dose") or "",
                               "taken_today": item["taken_today"], "suggestion": better})
    order = [m["id"] for m in meals]
    return {"groups": sorted(groups.values(), key=lambda g: order.index(g["slot"]))}
