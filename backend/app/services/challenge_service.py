"""Friend challenges: invite a friend, accept, and track progress from logs.

Progress only counts what each person logged between the challenge's start
and end dates, so it can't be finished early or carried over. Completing a
challenge pays a small XP reward once per challenge, at most a couple of
times a week, and only a few challenges can be open at once, so challenges
can't be used to farm XP. Friends see each other's progress as counts
("4 of 7 days"), never the underlying food or health numbers.
"""
import logging
from datetime import date, timedelta
from typing import Any, Dict

from app.models import challenge as store
from app.models.friend import STATUS_ACCEPTED, Friendship
from app.models.user import User
from app.progress.challenges import CHALLENGE_KINDS, progress
from app.services import gamification_service, notification_service, user_service
from app.services.progress_service import ProgressServiceError, day_records
from app.utils.time import local_today

logger = logging.getLogger(__name__)

CHALLENGE_XP = 40
MAX_OPEN_CHALLENGES = 3
MAX_REWARDS_PER_WEEK = 2
INVITE_EXPIRY_DAYS = 7
NOTIFICATION_TYPE = "challenge"


def _display_name(user: User) -> str:
    return getattr(user, "name", None) or user.username


def _status(doc: dict, today: date) -> str:
    """Stored status plus the time-based ones (expired invites, finished challenges)."""
    if doc["status"] == store.STATUS_PENDING:
        created = date.fromisoformat(doc["created_on"])
        return "expired" if (today - created).days >= INVITE_EXPIRY_DAYS else store.STATUS_PENDING
    if doc["status"] == store.STATUS_ACTIVE and doc["end_date"] and doc["end_date"] < today.isoformat():
        return "finished"
    return doc["status"]


async def _participant_progress(user_id: str, doc: dict, today: date) -> Dict[str, Any]:
    user = await User.get_by_id(user_id)
    if user is None or not doc["start_date"]:
        return {"user_id": user_id, "name": None, "count": 0, "goal": CHALLENGE_KINDS[doc["kind"]]["goal"], "completed": False}
    end = min(doc["end_date"], today.isoformat())
    days = await day_records(user_id, doc["start_date"], end) if end >= doc["start_date"] else []
    targets = await user_service.get_targets(user) or {}
    result = progress(doc["kind"], days, targets)
    return {"user_id": user_id, "name": _display_name(user), **result}


async def _rewards_this_week(user_id: str, today: date) -> int:
    since = (today - timedelta(days=7)).isoformat()
    return sum(
        1 for d in await store.list_for(user_id)
        if user_id in d.get("rewarded", []) and (d.get("rewarded_on", {}) or {}).get(user_id, "") >= since
    )


async def _maybe_reward(user_id: str, doc: dict, mine: Dict[str, Any], today: date) -> bool:
    """Pay the completion XP once, if the cap allows."""
    if not mine["completed"] or user_id in doc.get("rewarded", []):
        return False
    if await _rewards_this_week(user_id, today) >= MAX_REWARDS_PER_WEEK:
        return False
    if not await store.claim_reward(doc["id"], user_id):
        return False
    rewarded_on = {**(doc.get("rewarded_on") or {}), user_id: today.isoformat()}
    await store.update(doc["id"], {"rewarded_on": rewarded_on})
    await gamification_service.award_xp(user_id, CHALLENGE_XP)
    doc.setdefault("rewarded", []).append(user_id)
    return True


async def _public(user_id: str, doc: dict, today: date) -> Dict[str, Any]:
    status = _status(doc, today)
    friend_id = doc["opponent_id"] if doc["creator_id"] == user_id else doc["creator_id"]
    friend = await User.get_by_id(friend_id)
    out: Dict[str, Any] = {
        "id": doc["id"],
        "kind": doc["kind"],
        "status": status,
        "is_creator": doc["creator_id"] == user_id,
        "friend": {"id": friend_id, "name": _display_name(friend) if friend else None},
        "start_date": doc["start_date"],
        "end_date": doc["end_date"],
        "goal": CHALLENGE_KINDS[doc["kind"]]["goal"],
        "unit": CHALLENGE_KINDS[doc["kind"]]["unit"],
        "xp_reward": CHALLENGE_XP,
        "me": None,
        "them": None,
        "rewarded": user_id in doc.get("rewarded", []),
    }
    if status in (store.STATUS_ACTIVE, "finished"):
        mine = await _participant_progress(user_id, doc, today)
        theirs = await _participant_progress(friend_id, doc, today)
        out["me"] = {k: mine[k] for k in ("count", "goal", "completed")}
        out["them"] = {k: theirs[k] for k in ("count", "goal", "completed")}
        # Completion counts inside the window only (progress stops at end_date).
        out["just_rewarded"] = await _maybe_reward(user_id, doc, mine, today)
        out["rewarded"] = user_id in doc.get("rewarded", [])
    return out


async def list_challenges(user_id: str) -> Dict[str, Any]:
    """The user's challenges with live progress, plus the kinds they can start."""
    today = local_today()
    docs = await store.list_for(user_id)
    recent_cutoff = (today - timedelta(days=30)).isoformat()
    shown = [
        d for d in docs
        if d["status"] in store.OPEN_STATUSES or (d.get("end_date") or d["created_on"]) >= recent_cutoff
    ]
    challenges = [await _public(user_id, d, today) for d in shown]
    challenges = [c for c in challenges if c["status"] not in (store.STATUS_CANCELLED,)]
    kinds = [{"kind": k, **v} for k, v in CHALLENGE_KINDS.items()]
    return {"challenges": challenges, "kinds": kinds, "xp_reward": CHALLENGE_XP, "max_open": MAX_OPEN_CHALLENGES}


async def _open_count(user_id: str, today: date) -> int:
    return sum(1 for d in await store.list_for(user_id) if _status(d, today) in store.OPEN_STATUSES)


async def create_challenge(user_id: str, friend_id: str, kind: str) -> Dict[str, Any]:
    """Invite an accepted friend to a challenge."""
    if kind not in CHALLENGE_KINDS:
        raise ProgressServiceError("Unknown challenge")
    if friend_id == user_id:
        raise ProgressServiceError("Pick a friend to challenge")
    friendship = await Friendship.find_between(user_id, friend_id)
    if friendship is None or friendship.status != STATUS_ACCEPTED:
        raise ProgressServiceError("You can only challenge friends", 403)
    today = local_today()
    if await _open_count(user_id, today) >= MAX_OPEN_CHALLENGES:
        raise ProgressServiceError(f"You can have up to {MAX_OPEN_CHALLENGES} challenges going at once")
    for d in await store.list_for(user_id):
        if d["kind"] == kind and friend_id in (d["creator_id"], d["opponent_id"]) and _status(d, today) in store.OPEN_STATUSES:
            raise ProgressServiceError("You already have this challenge going with this friend", 409)
    doc = await store.create(user_id, friend_id, kind, today.isoformat())
    creator = await User.get_by_id(user_id)
    await notification_service.create_notification(
        friend_id, NOTIFICATION_TYPE,
        f"{_display_name(creator) if creator else 'A friend'} challenged you. Take a look on your dashboard.",
        meta={"challenge_id": doc["id"], "kind": kind},
    )
    return await _public(user_id, doc, today)


async def _get_for(user_id: str, challenge_id: str) -> dict:
    doc = await store.get(challenge_id)
    if doc is None or user_id not in (doc["creator_id"], doc["opponent_id"]):
        raise ProgressServiceError("Challenge not found", 404)
    return doc


async def accept_challenge(user_id: str, challenge_id: str) -> Dict[str, Any]:
    """Accept an invite; the challenge runs from today for its set number of days."""
    doc = await _get_for(user_id, challenge_id)
    today = local_today()
    if doc["opponent_id"] != user_id or _status(doc, today) != store.STATUS_PENDING:
        raise ProgressServiceError("This invite can't be accepted", 409)
    # This invite is already one of the open ones, so accepting it adds nothing new.
    if await _open_count(user_id, today) > MAX_OPEN_CHALLENGES:
        raise ProgressServiceError(f"You can have up to {MAX_OPEN_CHALLENGES} challenges going at once")
    duration = CHALLENGE_KINDS[doc["kind"]]["duration_days"]
    fields = {
        "status": store.STATUS_ACTIVE,
        "start_date": today.isoformat(),
        "end_date": (today + timedelta(days=duration - 1)).isoformat(),
    }
    await store.update(challenge_id, fields)
    doc.update(fields)
    accepter = await User.get_by_id(user_id)
    await notification_service.create_notification(
        doc["creator_id"], NOTIFICATION_TYPE,
        f"{_display_name(accepter) if accepter else 'Your friend'} accepted your challenge. It starts today.",
        meta={"challenge_id": challenge_id},
    )
    return await _public(user_id, doc, today)


async def decline_challenge(user_id: str, challenge_id: str) -> None:
    """Decline an invite (invitee) or cancel it (creator) while it's pending."""
    doc = await _get_for(user_id, challenge_id)
    if _status(doc, local_today()) != store.STATUS_PENDING:
        raise ProgressServiceError("Only pending invites can be declined", 409)
    status = store.STATUS_CANCELLED if doc["creator_id"] == user_id else store.STATUS_DECLINED
    await store.update(challenge_id, {"status": status})

