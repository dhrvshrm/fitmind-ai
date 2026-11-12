"""Consent for storing health data.

Health data is only stored after the user explicitly agrees to a scope:

- ``health_profile``: conditions and medications they tell us about.
- ``health_reports``: lab reports they upload and the values they confirm.

Each consent is versioned. When the consent text changes in a way that
matters, bump the version here: older consents stop counting and the app asks
again. Withdrawing consent deletes the data that scope covers.
"""
import logging
from typing import Dict, List

from app.models import audit
from app.models import consent as consent_model

logger = logging.getLogger(__name__)

SCOPE_HEALTH_PROFILE = "health_profile"
SCOPE_HEALTH_REPORTS = "health_reports"

# Current version of each consent text (see frontend/src/constants/healthStrings.ts).
CONSENT_VERSIONS: Dict[str, int] = {
    SCOPE_HEALTH_PROFILE: 1,
    SCOPE_HEALTH_REPORTS: 1,
}
SCOPES = tuple(CONSENT_VERSIONS)


class ConsentRequired(Exception):
    """The user hasn't agreed (or no longer agrees) to this kind of data being stored."""

    def __init__(self, scope: str):
        super().__init__(f"Please agree to how we handle your {scope.replace('_', ' ')} first")
        self.scope = scope


def _check_scope(scope: str) -> None:
    if scope not in CONSENT_VERSIONS:
        raise ValueError(f"Unknown consent scope: {scope}")


async def has_consent(user_id: str, scope: str) -> bool:
    """True when the user has a current, not withdrawn consent for ``scope``."""
    _check_scope(scope)
    record = await consent_model.active(user_id, scope)
    return bool(record) and record.get("version", 0) >= CONSENT_VERSIONS[scope]


async def require(user_id: str, scope: str) -> None:
    """Raise :class:`ConsentRequired` unless the user has consented to ``scope``."""
    if not await has_consent(user_id, scope):
        raise ConsentRequired(scope)


async def status(user_id: str) -> List[dict]:
    """Every scope with whether it's granted, when, and at which version."""
    result = []
    for scope, version in CONSENT_VERSIONS.items():
        record = await consent_model.active(user_id, scope)
        granted = bool(record) and record.get("version", 0) >= version
        result.append({
            "scope": scope,
            "granted": granted,
            "version": record.get("version") if record else None,
            "current_version": version,
            "granted_at": record.get("granted_at") if record else None,
        })
    return result


async def grant(user_id: str, scope: str) -> dict:
    """Record the user's consent to the current version of ``scope``."""
    _check_scope(scope)
    await consent_model.revoke(user_id, scope)
    record = await consent_model.grant(user_id, scope, CONSENT_VERSIONS[scope])
    await audit.record_change(
        user_id, "consent", "grant", after={"scope": scope, "version": record["version"]},
        entity_id=record["id"],
    )
    return record


async def withdraw(user_id: str, scope: str) -> Dict[str, int]:
    """Withdraw consent for ``scope`` and delete the health data it covers.

    Returns how many records were deleted.
    """
    _check_scope(scope)
    await consent_model.revoke(user_id, scope)
    removed = 0
    if scope == SCOPE_HEALTH_PROFILE:
        from app.services import health_profile_service

        removed = await health_profile_service.delete_profile(user_id)
    elif scope == SCOPE_HEALTH_REPORTS:
        from app.services import lab_report_service

        removed = await lab_report_service.delete_all(user_id)
    # The audit entry records that it happened, never the health data itself.
    await audit.record_change(user_id, "consent", "withdraw", before={"scope": scope}, after={})
    logger.info("User %s withdrew %s consent; %d record(s) deleted", user_id, scope, removed)
    return {"deleted": removed}
