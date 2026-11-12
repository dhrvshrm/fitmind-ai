"""Web Push: store browser subscriptions and send notifications to a user's devices.

Uses the free Web Push protocol with VAPID keys (``VAPID_PUBLIC_KEY``,
``VAPID_PRIVATE_KEY``, ``VAPID_SUBJECT``). Without the keys push is switched
off: subscribing is refused politely and :func:`send_push` sends nothing.

Other features reuse :func:`send_push` for their own reminders.
"""
import asyncio
import json
import logging
from typing import Dict, Optional

from app.config.settings import get_settings
from app.models import push as push_store
from app.services import analytics_service

logger = logging.getLogger(__name__)

# Push services answer 404/410 when a subscription has expired or was revoked.
GONE_STATUSES = {404, 410}
# Seconds a push service keeps an undelivered message (phone offline).
PUSH_TTL_SECONDS = 4 * 60 * 60
DEFAULT_URL = "/today"
MAX_TITLE = 80
MAX_BODY = 200


class PushError(Exception):
    """A push request that can't be completed (e.g. push isn't set up)."""


def is_enabled() -> bool:
    """True when VAPID keys are configured, so pushes can be sent."""
    s = get_settings()
    return bool(s.VAPID_PUBLIC_KEY and s.VAPID_PRIVATE_KEY and s.VAPID_SUBJECT)


def public_key() -> Optional[str]:
    """The VAPID public key the browser needs to subscribe, or None when push is off."""
    return get_settings().VAPID_PUBLIC_KEY if is_enabled() else None


def _subject() -> str:
    subject = get_settings().VAPID_SUBJECT
    return subject if subject.startswith(("mailto:", "https://")) else f"mailto:{subject}"


async def subscribe(user_id: str, subscription: Dict, user_agent: Optional[str] = None) -> None:
    """Save the browser's push subscription for the user.

    Raises:
        PushError: if push isn't set up on the server or the subscription is incomplete.
    """
    if not is_enabled():
        raise PushError("Reminders aren't available right now")
    endpoint = subscription.get("endpoint")
    keys = subscription.get("keys") or {}
    if not endpoint or not keys.get("p256dh") or not keys.get("auth"):
        raise PushError("This browser didn't share what's needed for reminders")
    await push_store.save_subscription(user_id, endpoint, keys, user_agent)
    await analytics_service.track(user_id, analytics_service.PUSH_SUBSCRIBED)


async def unsubscribe(user_id: str, endpoint: str) -> None:
    """Forget one of the user's devices."""
    if await push_store.delete_subscription(endpoint, user_id):
        await analytics_service.track(user_id, analytics_service.PUSH_UNSUBSCRIBED)


async def has_subscription(user_id: str) -> bool:
    return bool(await push_store.subscriptions_for(user_id))


def _send_one(subscription: dict, payload: str) -> None:
    """Blocking send to one device (run in a worker thread)."""
    from pywebpush import webpush  # Imported lazily: only needed when push is on.

    settings = get_settings()
    webpush(
        subscription_info={"endpoint": subscription["endpoint"], "keys": subscription["keys"]},
        data=payload,
        vapid_private_key=settings.VAPID_PRIVATE_KEY,
        vapid_claims={"sub": _subject()},
        ttl=PUSH_TTL_SECONDS,
        timeout=10,
    )


def _status_of(error: Exception) -> Optional[int]:
    response = getattr(error, "response", None)
    return getattr(response, "status_code", None)


async def send_push(user_id: str, title: str, body: str, url: str = DEFAULT_URL,
                    tag: Optional[str] = None) -> int:
    """Send a notification to every device the user turned reminders on for.

    ``url`` is the app path opened when the notification is tapped; ``tag``
    lets a newer notification replace an older one with the same tag.
    Never raises. Expired subscriptions are removed. Returns how many devices
    accepted the message (0 when push is off or the user has no devices).
    """
    if not is_enabled():
        return 0
    try:
        subscriptions = await push_store.subscriptions_for(user_id)
    except Exception as e:
        logger.warning("Could not load push subscriptions for %s: %s", user_id, e)
        return 0
    payload = json.dumps({
        "title": title[:MAX_TITLE],
        "body": body[:MAX_BODY],
        "url": url if url.startswith("/") else DEFAULT_URL,
        "tag": tag,
    })
    delivered = 0
    for sub in subscriptions:
        try:
            await asyncio.to_thread(_send_one, sub, payload)
            delivered += 1
        except Exception as e:
            if _status_of(e) in GONE_STATUSES:
                await push_store.delete_subscription(sub["endpoint"])
                logger.info("Removed expired push subscription for %s", user_id)
            else:
                logger.warning("Push to %s failed: %s", user_id, e)
    return delivered
