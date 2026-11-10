"""Tip of the day: one short tip or "did you know" fact, the same for everyone each day.

Written by AI once per day (cached, so it costs one call a day in total, not
one per user) and checked against the style rules. If the AI is unavailable
or the text breaks the rules, a hand-written tip is used instead, so the card
is never empty and never unchecked.
"""
import logging
from datetime import date, timedelta
from typing import Dict, List, Literal

from pydantic import BaseModel, Field

from app.ai import cache
from app.ai import client as ai_client
from app.ai.client import AIError
from app.ai.style import STYLE_GUIDE, find_style_violations
from app.utils.time import local_today

logger = logging.getLogger(__name__)

TipKind = Literal["tip", "fact"]
TIP_PROMPT_VERSION = 1

# One topic per day, in turn, so tips cover the whole of fitness over a week.
TOPICS: List[str] = [
    "nutrition and protein",
    "strength training",
    "sleep and recovery",
    "how the human body works",
    "Indian foods and home cooking",
    "hydration",
    "building healthy habits",
]


class Tip(BaseModel):
    kind: TipKind
    text: str = Field(..., min_length=20, max_length=220)


# Accurate, hand-written tips used when the AI can't produce one.
FALLBACK_TIPS: List[Dict[str, str]] = [
    {"kind": "fact", "text": "Muscle grows during recovery, not during the workout itself. Sleep is when most of that repair happens."},
    {"kind": "tip", "text": "Add a bowl of dal, curd or a handful of chana to the meal you skip protein in most. Small swaps add up."},
    {"kind": "fact", "text": "Thirst often shows up as tiredness or a mild headache before you feel thirsty. A glass of water is an easy first fix."},
    {"kind": "tip", "text": "Walk for 10 minutes after your biggest meal. It helps your body handle the sugar from that meal."},
    {"kind": "fact", "text": "Your heart is a muscle too, and regular cardio makes it pump more blood with every beat."},
    {"kind": "tip", "text": "Keep your phone out of reach at bedtime. Screens late at night make it harder to fall asleep."},
    {"kind": "fact", "text": "Sprouting moong or chana makes some nutrients easier for your body to absorb."},
    {"kind": "tip", "text": "Can't fit a full workout today? Ten minutes still counts. Consistency beats the perfect session."},
    {"kind": "fact", "text": "Fibre from dal, vegetables and whole grains keeps you full for longer, which makes eating less easier."},
    {"kind": "tip", "text": "Stop each set with a rep or two left in the tank. You'll recover faster and still make progress."},
]


def _prompt(kind: TipKind, topic: str) -> str:
    style = "a practical tip to try today" if kind == "tip" else "a surprising 'did you know' fact"
    return (
        f"Write {style} about {topic} for someone in India trying to get fitter and eat better.\n"
        "Rules:\n"
        "- It must be accurate and widely accepted in sports science or nutrition science.\n"
        "- No medical advice, no supplements, no diagnosis, no weight-loss promises.\n"
        "- No exact numbers or percentages unless they are well established.\n"
        "- One or two plain sentences, at most 200 characters. No greeting, no emoji, no hashtags.\n"
        f'kind is "{kind}".'
    )


def _fallback(day: date) -> Tip:
    chosen = FALLBACK_TIPS[day.toordinal() % len(FALLBACK_TIPS)]
    return Tip(kind=chosen["kind"], text=chosen["text"])  # type: ignore[arg-type]


async def tip_of_the_day() -> dict:
    """Today's tip for the person's local date."""
    today = local_today()
    kind: TipKind = "fact" if today.toordinal() % 2 == 0 else "tip"
    topic = TOPICS[today.toordinal() % len(TOPICS)]
    try:
        tip = await ai_client.generate_json(
            _prompt(kind, topic),
            Tip,
            system=STYLE_GUIDE,
            temperature=0.9,
            # One tip per date for everyone; it contains no personal data.
            cache_key=cache.make_key(f"daily-tip-v{TIP_PROMPT_VERSION}", today.isoformat()),
            cache_ttl=timedelta(days=2),
        )
        if find_style_violations(tip.text):
            raise AIError(f"style: {find_style_violations(tip.text)}")
        source = "ai"
    except AIError as e:
        logger.info("Tip of the day fell back to a written tip: %s", e)
        tip, source = _fallback(today), "curated"
    return {"date": today.isoformat(), "kind": tip.kind, "text": tip.text, "topic": topic, "source": source}
