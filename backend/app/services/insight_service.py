"""Weekly insight: a short note on last week (what went well, one thing to change).

The numbers are computed first (``progress_service.week_stats``); the AI only
puts them into words, and is never asked to work anything out. If the AI is
unavailable, or its text breaks the style rules, a rule-based note built from
the same numbers is used. One insight is kept per user per week.
"""
import json
import logging
from datetime import timedelta
from typing import Any, Dict, List, Optional, Tuple

from pydantic import BaseModel, Field

from app.ai import client as ai_client
from app.ai.client import AIError
from app.ai.style import STYLE_GUIDE, find_style_violations
from app.models import progress as store
from app.models.user import User
from app.progress.flex import week_start
from app.services.progress_service import week_stats
from app.utils.time import local_today

logger = logging.getLogger(__name__)

INSIGHT_PROMPT_VERSION = 1
# Fewer active days than this and there's not enough to say anything useful.
MIN_ACTIVE_DAYS = 3


class InsightText(BaseModel):
    headline: str = Field(..., min_length=8, max_length=90)
    went_well: str = Field(..., min_length=15, max_length=240)
    one_change: str = Field(..., min_length=15, max_length=240)


def _ratio(done: int, of: int) -> float:
    return done / of if of else 0.0


def _rule_based(stats: Dict[str, Any]) -> InsightText:
    """A plain note from the numbers alone: the strongest area and the weakest one."""
    days = stats["days"]
    strengths: List[Tuple[float, str]] = []
    gaps: List[Tuple[float, str]] = []

    if stats["workouts_planned"]:
        r = _ratio(stats["workouts_done"], stats["workouts_planned"])
        text = f"You trained on {stats['workouts_done']} of your {stats['workouts_planned']} planned days."
        (strengths if r >= 0.75 else gaps).append(
            (r, text if r >= 0.75 else "Pick one planned workout day this week and protect it, even if it's a short session.")
        )
    elif stats["workouts_done"]:
        strengths.append((0.6, f"You fitted in {stats['workouts_done']} workout days."))

    r = _ratio(stats["meal_days"], days)
    if r >= 0.7:
        strengths.append((r, f"You logged food on {stats['meal_days']} of {days} days, which makes everything else more accurate."))
    else:
        gaps.append((r, "Log at least one meal a day, even a rough one. The trends get much more useful."))

    if stats["protein_target"] and stats["average_protein"] is not None:
        r = _ratio(stats["protein_days"], max(stats["meal_days"], 1))
        if r >= 0.6:
            strengths.append((r, f"You reached your protein target on {stats['protein_days']} days."))
        else:
            gaps.append((r, f"Protein averaged {stats['average_protein']} g against a {stats['protein_target']} g target. Add dal, curd, paneer, eggs or chana to one more meal."))

    if stats["water_days"] >= 4:
        strengths.append((_ratio(stats["water_days"], days), f"You hit your water target on {stats['water_days']} days."))

    strengths.sort(reverse=True)
    gaps.sort()
    went_well = strengths[0][1] if strengths else "You checked in on your progress, and that's where change starts."
    one_change = gaps[0][1] if gaps else "Keep the same routine this week. It's working."
    headline = "A steady week" if len(strengths) >= len(gaps) else "Room to build on"
    return InsightText(headline=headline, went_well=went_well, one_change=one_change)


def _prompt(stats: Dict[str, Any], name: str) -> str:
    facts = {k: v for k, v in stats.items() if v is not None}
    return (
        f"Write a short weekly note for {name}, who uses a fitness and nutrition app in India.\n"
        "Use ONLY these computed numbers from their last week; don't invent or recalculate anything:\n"
        f"{json.dumps(facts, ensure_ascii=False)}\n\n"
        "Fields:\n"
        "- headline: a few plain words summing up the week.\n"
        "- went_well: one or two sentences on the strongest thing, with its number.\n"
        "- one_change: one specific, doable change for next week, tied to the weakest number.\n"
        "Rules: second person, warm and plain, no guilt, no medical advice, no weight-loss promises, "
        "no emoji, no exclamation marks. If weight is mentioned, talk about the trend, not single weigh-ins."
    )


def _violations(text: InsightText) -> List[str]:
    return [v for field in (text.headline, text.went_well, text.one_change) for v in find_style_violations(field)]


async def _write(user: User, stats: Dict[str, Any]) -> Tuple[InsightText, str]:
    name = getattr(user, "name", None) or user.username
    try:
        text = await ai_client.generate_json(
            _prompt(stats, name), InsightText, system=STYLE_GUIDE, temperature=0.5, user_id=user.id,
        )
        problems = _violations(text)
        if problems:
            raise AIError(f"style: {problems}")
        return text, "ai"
    except AIError as e:
        logger.info("Weekly insight fell back to the rule-based note: %s", e)
        return _rule_based(stats), "rule"


async def get_weekly_insight(user: User) -> Dict[str, Any]:
    """The insight for the last complete Monday-Sunday week (cached for that week)."""
    today = local_today()
    start = week_start(today) - timedelta(days=7)
    end = start + timedelta(days=6)
    cached: Optional[dict] = await store.get_insight(user.id, start.isoformat())
    # A rule-based note is retried with the AI at most once a day.
    if cached and (cached.get("source") != "rule" or cached.get("attempted_on") == today.isoformat()):
        cached.pop("user_id", None)
        cached.pop("created_at", None)
        return cached

    stats = await week_stats(user, start, end)
    if stats["active_days"] < MIN_ACTIVE_DAYS:
        return {"status": "not_enough_data", "week_start": start.isoformat(), "week_end": end.isoformat(),
                "active_days": stats["active_days"], "required_active_days": MIN_ACTIVE_DAYS}

    text, source = await _write(user, stats)
    insight = {
        "status": "ready",
        "week_start": start.isoformat(),
        "week_end": end.isoformat(),
        **text.model_dump(),
        "stats": stats,
        "source": source,
        "attempted_on": today.isoformat(),
    }
    await store.save_insight(user.id, start.isoformat(), insight)
    return insight
