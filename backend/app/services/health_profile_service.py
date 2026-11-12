"""The manual health profile: conditions, medications, and what they change.

Every recorded value carries its provenance (``self_reported`` or ``report``)
and the date it was recorded, so the app never mistakes an old or second-hand
answer for a current fact. Missing answers mean "unknown", never "healthy".

Nothing is stored without ``health_profile`` consent (consent_service).
"""
import logging
from typing import Any, Dict, List, Optional, Set

from app.health import plan_rules
from app.health.questionnaire import CONDITIONS, PROVENANCE_SELF, clean_details
from app.models import audit
from app.models import health_profile as profile_model
from app.services import consent_service
from app.services.consent_service import SCOPE_HEALTH_PROFILE, SCOPE_HEALTH_REPORTS
from app.utils.time import local_today_iso

logger = logging.getLogger(__name__)

CONDITION_LABELS = {
    "diabetes": "diabetes",
    "pcos": "PCOS",
    "thyroid": "a thyroid condition",
    "hypertension": "high blood pressure",
    "high_cholesterol": "high cholesterol",
    "kidney": "a kidney condition",
    "pregnancy": "pregnancy or breastfeeding",
    "digestive": "digestive issues",
}
DETAIL_LABELS = {
    "type1": "type 1", "type2": "type 2", "prediabetes": "prediabetes", "gestational": "gestational",
    "hypothyroid": "underactive (hypothyroid)", "hyperthyroid": "overactive (hyperthyroid)",
    "ckd": "chronic kidney disease", "kidney_stones": "kidney stones", "pregnant": "pregnant",
    "breastfeeding": "breastfeeding", "ibs": "IBS", "acid_reflux": "acid reflux", "ibd": "IBD",
}


class HealthProfileError(Exception):
    """An invalid questionnaire answer."""


def _entry(value: Any, previous: Optional[dict], today: str) -> Optional[dict]:
    """A value with provenance; unchanged values keep their original record."""
    if value is None or value == "":
        return None
    if previous and previous.get("value") == value:
        return previous
    return {"value": value, "provenance": PROVENANCE_SELF, "recorded_at": today}


async def get_profile(user_id: str) -> Optional[dict]:
    """The decrypted profile, or None without consent or answers."""
    if not await consent_service.has_consent(user_id, SCOPE_HEALTH_PROFILE):
        return None
    return await profile_model.get(user_id)


async def save_profile(user_id: str, answers: Dict[str, Any]) -> dict:
    """Store the questionnaire answers (requires consent).

    Raises:
        ConsentRequired: without ``health_profile`` consent.
        HealthProfileError: for an invalid follow-up answer.
    """
    await consent_service.require(user_id, SCOPE_HEALTH_PROFILE)
    previous = await profile_model.get(user_id) or {}
    previous_conditions = {c["key"]: c for c in previous.get("conditions") or []}
    today = local_today_iso()

    conditions = []
    seen: Set[str] = set()
    for item in answers.get("conditions") or []:
        key = item["key"]
        if key in seen:
            continue
        seen.add(key)
        try:
            details = clean_details(key, item.get("details"))
        except ValueError as e:
            raise HealthProfileError(str(e)) from e
        before = previous_conditions.get(key)
        if before and before.get("details") == details:
            conditions.append(before)
        else:
            conditions.append({"key": key, "details": details, "provenance": PROVENANCE_SELF, "recorded_at": today})

    other = (answers.get("other_conditions") or "").strip()
    medications = (answers.get("medications") or "").strip()
    data = {
        "conditions": conditions,
        "other_conditions": _entry(other, previous.get("other_conditions"), today),
        "medications": _entry(medications, previous.get("medications"), today),
        "blood_thinners": _entry(answers.get("blood_thinners"), previous.get("blood_thinners"), today),
    }
    saved = await profile_model.save(user_id, data)
    # Only which parts changed is audited, never the health data itself.
    await audit.record_change(user_id, "health_profile", "update",
                              before={"conditions": len(previous_conditions)},
                              after={"conditions": len(conditions)})
    return saved


async def delete_profile(user_id: str) -> int:
    """Delete the health profile (used when consent is withdrawn)."""
    removed = await profile_model.delete(user_id)
    if removed:
        await audit.record_change(user_id, "health_profile", "delete", before={"exists": True}, after={})
    return removed


async def health_flags(user_id: str) -> Set[str]:
    """Rule flags from consented health data only (profile and confirmed lab values)."""
    profile = await get_profile(user_id)
    latest: Dict[str, dict] = {}
    if await consent_service.has_consent(user_id, SCOPE_HEALTH_REPORTS):
        from app.services import lab_report_service

        latest = await lab_report_service.latest_values(user_id)
    return plan_rules.facts_from(profile, latest)


def plan_effects(flags: Set[str]) -> List[str]:
    """Codes describing how plans change, for the profile screen."""
    effects = []
    if {"diabetes", "pcos", "blood_sugar_high"} & flags:
        effects.append("blood_sugar")
    if "hypertension" in flags:
        effects.append("blood_pressure")
    if "high_cholesterol" in flags or "high_ldl" in flags:
        effects.append("cholesterol")
    if "kidney" in flags:
        effects.append("kidney")
    if "pregnancy" in flags:
        effects.append("pregnancy")
    return effects


def _describe_condition(condition: dict) -> str:
    label = CONDITION_LABELS.get(condition["key"], condition["key"])
    details = condition.get("details") or {}
    parts = [DETAIL_LABELS[v] for v in details.values() if isinstance(v, str) and v in DETAIL_LABELS]
    if details.get("on_medication") is True:
        parts.append("on medication")
    if details.get("uses_insulin") is True:
        parts.append("uses insulin")
    if details.get("on_dialysis") is True:
        parts.append("on dialysis")
    if details.get("trimester"):
        parts.append(f"{details['trimester']} trimester")
    return f"{label} ({', '.join(parts)})" if parts else label


async def health_context(user_id: str) -> str:
    """A short, factual summary of consented health data for AI prompts.

    Empty when there's nothing (or no consent). States provenance and that
    nothing here is a diagnosis, so the model doesn't over-read it.
    """
    lines: List[str] = []
    profile = await get_profile(user_id)
    if profile:
        conditions = [_describe_condition(c) for c in profile.get("conditions") or []]
        if conditions:
            lines.append("Self-reported conditions: " + "; ".join(conditions) + ".")
        other = (profile.get("other_conditions") or {}).get("value")
        if other:
            lines.append(f"Other conditions they mentioned: {other}.")
        meds = (profile.get("medications") or {}).get("value")
        if meds:
            lines.append(f"Current medications (self-reported): {meds}.")
        if (profile.get("blood_thinners") or {}).get("value") is True:
            lines.append("Takes a blood thinner.")
    if await consent_service.has_consent(user_id, SCOPE_HEALTH_REPORTS):
        from app.services import lab_report_service

        latest = await lab_report_service.latest_values(user_id)
        described = []
        for item in latest.values():
            state = {"low": "below usual range", "high": "above usual range",
                     "in_range": "in usual range"}.get(item["status"], "no reference range")
            described.append(f"{item['name']} {item['value']:g} {item['unit']} ({item['measured_at']}, {state})")
        if described:
            lines.append("Latest lab values the user confirmed: " + "; ".join(described) + ".")
    from app.services import supplement_service

    taking = await supplement_service.list_user_supplements(user_id)
    if taking:
        lines.append("Supplements they take: " + "; ".join(
            f"{s['name']}{' ' + s['dose'] if s.get('dose') else ''}" for s in taking) + ".")
    if not lines:
        return ""
    flags = await health_flags(user_id)
    effects = plan_effects(flags)
    if effects:
        lines.append("Meal plan rules applied: " + ", ".join(effects) + ".")
    lines.append(
        "This is context, not a diagnosis. Do not diagnose or prescribe; suggest discussing "
        "medical questions and anything out of range with their doctor."
    )
    return "Health context:\n" + "\n".join(lines)


def questionnaire() -> Dict[str, Any]:
    """The questionnaire structure (keys only; the app supplies the wording)."""
    return {"conditions": CONDITIONS}


async def profile_view(user_id: str) -> dict:
    """What the profile screen needs: consent, answers and their effects."""
    granted = await consent_service.has_consent(user_id, SCOPE_HEALTH_PROFILE)
    profile = await profile_model.get(user_id) if granted else None
    flags = await health_flags(user_id) if granted else set()
    return {"consented": granted, "profile": profile, "plan_effects": plan_effects(flags)}
