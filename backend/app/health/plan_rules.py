"""How a health profile shapes meal plans. Rules, not AI, and never treatment.

Effects (only with the user's ``health_profile`` / ``health_reports`` consent):

- Diabetes or prediabetes, PCOS, or a confirmed high HbA1c / fasting glucose:
  refined grains, added sugar and sweet drinks are left out of plans (as long
  as enough foods remain). Based on ICMR-NIN Dietary Guidelines for Indians
  2024 and ADA Standards of Care 2025 section 5 (nutrition therapy).
- High blood pressure: a note to keep salt low (WHO: under 5 g salt a day).
- Pregnancy or breastfeeding: no calorie deficit, and a "talk to your doctor"
  note (targets.py already does this when onboarding recorded it; the health
  profile is another way to tell us).
- Chronic kidney disease (not on dialysis): protein capped at 0.8 g/kg, with
  a note to agree protein with a doctor. KDOQI 2020 nutrition guideline for
  CKD advises restricted protein under medical supervision; 0.8 g/kg is the
  general adult RDA and the safe upper point here. On dialysis protein needs
  go UP, so no cap is applied, only the doctor note.
- High cholesterol: a note about fried foods and saturated fat (NCEP ATP III).

Plans show these as notes; the doctor's word always comes first.
"""
import logging
from typing import Any, Dict, List, Optional, Set, Tuple

from app.nutrition.diet_rules import food_tokens
from app.nutrition.food_db import Food
from app.nutrition.text import tokens

logger = logging.getLogger(__name__)

KIDNEY_PROTEIN_PER_KG = 0.8
KCAL_PER_G_CARB = 4
KCAL_PER_G_PROTEIN = 4
# Keep the blood-sugar filter only when at least this share of foods remains.
MIN_POOL_SHARE = 0.5

_REFINED_WORDS = (
    "maida", "naan", "kulcha", "bhatura", "sugar", "jaggery", "gur", "sweetened", "juice", "cola",
    "soda", "syrup", "candy", "jalebi", "halwa", "ladoo", "barfi", "cornflakes", "noodles", "pasta",
    "pastry", "cake", "biscuit", "cookie", "rusk", "doughnut", "muffin",
)
REFINED_TOKENS = frozenset().union(*(tokens(w) for w in _REFINED_WORDS))
# Multi-word refined foods: all of the words must be in the food's name.
REFINED_PHRASES = (frozenset(tokens("white bread")), frozenset(tokens("instant noodles")))

MEDICATION_WORDS = {
    "blood_thinners": ("warfarin", "acitrom", "acenocoumarol", "apixaban", "eliquis", "rivaroxaban",
                       "xarelto", "dabigatran", "heparin", "clopidogrel", "clopilet", "ticagrelor",
                       "prasugrel", "blood thinner", "anticoagulant", "ecosprin"),
    "thyroid_medication": ("levothyroxine", "thyroxine", "eltroxin", "thyronorm", "thyrox",
                           "carbimazole", "methimazole", "neomercazole"),
    "diabetes_medication": ("metformin", "insulin", "glimepiride", "gliclazide", "sitagliptin",
                            "vildagliptin", "dapagliflozin", "empagliflozin", "pioglitazone",
                            "semaglutide", "glycomet"),
    "bp_medication": ("amlodipine", "telmisartan", "losartan", "olmesartan", "ramipril", "enalapril",
                      "metoprolol", "atenolol", "hydrochlorothiazide", "chlorthalidone"),
}


def _mentions(text: str, words: Tuple[str, ...]) -> bool:
    lowered = f" {text.lower()} "
    return any(word in lowered for word in words)


def facts_from(profile: Optional[dict], latest_biomarkers: Optional[Dict[str, dict]] = None) -> Set[str]:
    """Plain flags (``diabetes``, ``ckd``, ``low_b12``...) from the profile and confirmed values."""
    flags: Set[str] = set()
    profile = profile or {}
    for condition in profile.get("conditions") or []:
        key = condition.get("key")
        details = condition.get("details") or {}
        flags.add(key)
        if details.get("on_medication"):
            flags.add(f"{key}_medication" if key != "hypertension" else "bp_medication")
        if key == "kidney":
            flags.add({"ckd": "ckd", "kidney_stones": "kidney_stones"}.get(details.get("type"), "kidney_other"))
            if details.get("on_dialysis"):
                flags.add("dialysis")
        if key == "pregnancy":
            flags.add(details.get("status") or "pregnant")
        if key == "thyroid" and details.get("type") in ("hypothyroid", "hyperthyroid"):
            flags.add(details["type"])
        if key == "diabetes" and details.get("uses_insulin"):
            flags.add("insulin")
    medications = (profile.get("medications") or {}).get("value") or ""
    for flag, words in MEDICATION_WORDS.items():
        if medications and _mentions(medications, words):
            flags.add(flag)
    if (profile.get("blood_thinners") or {}).get("value") is True:
        flags.add("blood_thinners")

    for code, item in (latest_biomarkers or {}).items():
        state = item.get("status")
        if state in ("low", "high"):
            flags.add(f"{state}_{code}")
    if {"high_hba1c", "high_fasting_glucose"} & flags:
        flags.add("blood_sugar_high")
    return flags


def _is_refined(food: Food) -> bool:
    found = food_tokens(food)
    return bool(found & REFINED_TOKENS) or any(phrase <= found for phrase in REFINED_PHRASES)


def filter_pool(pool: List[Food], flags: Set[str]) -> List[Food]:
    """Leave refined grains and sweets out when blood sugar matters."""
    if not ({"diabetes", "pcos", "blood_sugar_high"} & flags):
        return pool
    kept = [f for f in pool if not _is_refined(f)]
    return kept if len(kept) >= len(pool) * MIN_POOL_SHARE else pool


def adjust_targets(targets: Dict[str, Any], flags: Set[str], weight_kg: Optional[float]) -> Dict[str, Any]:
    """Targets with health rules applied (a copy; the input is not changed)."""
    result = dict(targets)
    result["flags"] = list(targets.get("flags") or [])
    if {"pregnant", "breastfeeding", "pregnancy"} & flags:
        tdee = targets.get("tdee")
        if tdee and result["calories"] < tdee:
            result["carbs"] = round(result["carbs"] + (tdee - result["calories"]) / KCAL_PER_G_CARB)
            result["calories"] = round(tdee)
        if "pregnancy_or_breastfeeding" not in result["flags"]:
            result["flags"].append("pregnancy_or_breastfeeding")
    if ("ckd" in flags or "kidney_other" in flags) and "dialysis" not in flags and weight_kg:
        cap = round(KIDNEY_PROTEIN_PER_KG * weight_kg)
        if result["protein"] > cap:
            moved = result["protein"] - cap
            result["protein"] = cap
            result["carbs"] = round(result["carbs"] + moved * KCAL_PER_G_PROTEIN / KCAL_PER_G_CARB)
            result["flags"].append("health_protein_capped")
    return result


def plan_notes(flags: Set[str]) -> List[dict]:
    """Notes shown with a plan (codes the app turns into plain language)."""
    values: Dict[str, int] = {}
    if {"diabetes", "pcos", "blood_sugar_high"} & flags:
        values["blood_sugar"] = 1
    if "hypertension" in flags:
        values["blood_pressure"] = 1
    if "high_cholesterol" in flags or "high_ldl" in flags:
        values["cholesterol"] = 1
    if "kidney" in flags:
        values["kidney"] = 1
    if {"pregnant", "breastfeeding", "pregnancy"} & flags:
        values["pregnancy"] = 1
    notes = [{"code": "health_adjusted", "values": values}] if values else []
    if "kidney" in flags or "pregnancy" in flags:
        notes.append({"code": "medical_advice", "values": {}})
    return notes


async def load_flags(user_id: str) -> Set[str]:
    """Health flags for a user, using only data they consented to share."""
    from app.services import health_profile_service

    return await health_profile_service.health_flags(user_id)


async def apply_to_plan(
    user_id: str, targets: Dict[str, Any], pool: List[Food], weight_kg: Optional[float]
) -> Tuple[Dict[str, Any], List[Food], List[dict]]:
    """Health-adjusted (targets, food pool, notes) for a meal plan.

    Never raises: a problem reading health data falls back to the plain plan.
    """
    try:
        flags = await load_flags(user_id)
    except Exception:  # Health data must never stop someone getting a plan.
        logger.exception("Could not load health flags for %s", user_id)
        return targets, pool, []
    if not flags:
        return targets, pool, []
    return adjust_targets(targets, flags, weight_kg), filter_pool(pool, flags), plan_notes(flags)


async def adjusted_targets(user_id: str, targets: Optional[Dict[str, Any]],
                           weight_kg: Optional[float]) -> Optional[Dict[str, Any]]:
    """Just the targets part of :func:`apply_to_plan` (for staleness checks)."""
    if not targets:
        return targets
    adjusted, _, _ = await apply_to_plan(user_id, targets, [], weight_kg)
    return adjusted
