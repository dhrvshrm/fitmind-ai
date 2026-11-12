""""What should I order?": best picks from a restaurant or delivery menu.

The model only chooses dishes from the menu and says why. Calories and
protein come from the app's own estimate pipeline (food datasets first, then a
labelled AI estimate), so every number shown is a backend estimate and is
labelled as one. Each pick carries a one-tap "log this" proposal.
"""
import logging
import re
from typing import Any, Dict, List

from pydantic import BaseModel, Field

from app.ai import client as ai_client
from app.ai.client import AIError, AIQuotaError
from app.ai.style import STYLE_GUIDE
from app.coach.registry import Proposal, Tool, ToolContext, ToolError, register
from app.coach.tools import _Args, _r, _remaining, meal_proposal_from_estimate
from app.models.user import User
from app.services import nutrition_service

logger = logging.getLogger(__name__)

MAX_MENU_CHARS = 6000
MAX_PICKS = 3
# Without AI, how many menu lines are estimated to find the best picks.
FALLBACK_CANDIDATES = 8


class MenuOption(BaseModel):
    name: str = Field(..., min_length=2, max_length=120, description="Dish name exactly as on the menu")
    portion: str = Field("", max_length=60, description="Suggested portion, e.g. '1 plate' or 'half'")
    why: str = Field("", max_length=220, description="One short reason it fits")


class MenuPick(BaseModel):
    options: List[MenuOption] = Field(..., min_length=1, max_length=MAX_PICKS)


class MenuItems(BaseModel):
    items: List[str] = Field(default_factory=list, max_length=80)


_PICK_SYSTEM = (
    "You are a nutrition coach helping someone choose what to order from a restaurant or "
    "delivery menu. Pick the dishes that best fit what they have left today: enough protein, "
    "within the calories, and nothing they must avoid. Prefer grilled, tandoori, dal, paneer, "
    "egg, chicken or fish dishes over fried or cream-heavy ones when they fit. Only choose "
    "dishes that appear on the menu. Do not give calorie numbers.\n\n" + STYLE_GUIDE
)

_PHOTO_PROMPT = (
    "This is a photo of a restaurant or delivery menu. List every dish name you can read, "
    "one per entry, without prices. Skip headings and drinks unless they are the only items."
)

_PRICE = re.compile(r"(?:rs\.?|inr|₹|\$)\s*\d+[\d.,]*|\d+[\d.,]*\s*(?:rs|/-|₹)|\b\d{2,4}(?:\.\d{1,2})?\s*$", re.I)


def menu_lines(text: str) -> List[str]:
    """Dish-like lines from a pasted menu, prices and numbering removed."""
    lines = []
    for raw in re.split(r"[\n;|]+", text):
        line = _PRICE.sub("", re.sub(r"\([^)]*\)|\[[^\]]*\]", " ", raw))
        line = re.sub(r"\s{2,}", " ", line)
        line = re.sub(r"^\s*(?:\d+[.)]|[-*•])\s*", "", line).strip(" -:.,\t")
        if 3 <= len(line) <= 80 and re.search(r"[a-zA-Z]{3}", line) and line.lower() not in {
            n.lower() for n in lines
        }:
            lines.append(line)
    return lines


async def read_menu_photo(user_id: str, image: bytes, mime_type: str) -> str:
    """Read dish names off a menu photo (Gemini vision).

    Raises:
        AIError: if vision isn't available or the photo can't be read.
    """
    result = await ai_client.generate_json_from_image(
        _PHOTO_PROMPT, image, mime_type, MenuItems, user_id=user_id
    )
    items = [i.strip() for i in result.items if i.strip()]
    if not items:
        raise AIError("no dishes found in the photo")
    return "\n".join(items)


async def _avoid(user_id: str) -> str:
    user = await User.get_by_id(user_id)
    prefs = (getattr(user, "food_preferences", None) or {}) if user else {}
    parts = []
    if prefs.get("diet_type"):
        parts.append(f"Diet: {prefs['diet_type']}.")
    avoid = [*(prefs.get("allergies") or []), *(prefs.get("excluded") or [])]
    if avoid:
        parts.append(f"Must avoid: {', '.join(avoid)}.")
    return " ".join(parts)


async def _ai_picks(user_id: str, menu: str, remaining: Dict[str, int]) -> List[MenuOption]:
    prompt = (
        f"Left today: about {remaining['kcal']} kcal and {remaining['protein']} g protein. "
        f"{await _avoid(user_id)}\n\nMenu:\n{menu}\n\n"
        f"Choose the best {MAX_PICKS} or fewer dishes for this person."
    )
    pick = await ai_client.generate_json(prompt, MenuPick, system=_PICK_SYSTEM, user_id=user_id)
    return pick.options


def _fit(option: Dict[str, Any], remaining: Dict[str, int]) -> tuple:
    """Sort key: fits the calories first, then more protein per calorie."""
    kcal = option["kcal"] or 1
    fits = remaining["kcal"] > 0 and kcal <= remaining["kcal"] * 1.1
    return (0 if fits else 1, -(option["protein"] / kcal))


async def suggest(user_id: str, menu_text: str) -> Dict[str, Any]:
    """The best 2-3 dishes on ``menu_text`` for what's left today, with estimates.

    Returns ``options`` (name, portion, why, kcal, protein, carbs, fat, fits),
    ``remaining``, ``proposals`` (one log_meal proposal per option) and a
    plain-text ``reply``.

    Raises:
        ToolError: if nothing on the menu could be estimated.
        AIQuotaError: if the daily AI limit is used up.
    """
    menu = menu_text.strip()[:MAX_MENU_CHARS]
    remaining = await _remaining(user_id)
    used_ai = True
    try:
        picks = await _ai_picks(user_id, menu, remaining)
    except AIQuotaError:
        raise
    except AIError as e:
        logger.info("Menu picks without AI for %s: %s", user_id, e)
        used_ai = False
        picks = [MenuOption(name=line[:120]) for line in menu_lines(menu)[:FALLBACK_CANDIDATES]
                 if len(line) >= 2]

    options: List[Dict[str, Any]] = []
    proposals: List[Proposal] = []
    for pick in picks:
        text = f"{pick.portion} {pick.name}".strip()
        try:
            estimate = await nutrition_service.estimate_meal(user_id, text)
            proposal = meal_proposal_from_estimate(estimate, None, title=f"Log {pick.name}")
        except (ToolError, AIError) as e:
            logger.info("Couldn't estimate menu item %r: %s", text, e)
            continue
        totals = proposal.payload["totals"]
        options.append({
            "name": pick.name, "portion": pick.portion, "why": pick.why,
            "kcal": _r(totals["kcal"]), "protein": _r(totals["protein"]),
            "carbs": _r(totals["carbs"]), "fat": _r(totals["fat"]),
            "estimate": True, "proposal_index": len(proposals),
        })
        proposals.append(proposal)

    if not options:
        raise ToolError("Couldn't estimate anything on that menu. Paste the dish names, one per line.")

    if not used_ai:
        ranked = sorted(options, key=lambda o: _fit(o, remaining))[:MAX_PICKS]
    else:
        ranked = options[:MAX_PICKS]
    for option in ranked:
        option["fits"] = _fit(option, remaining)[0] == 0
    chosen = [proposals[o["proposal_index"]] for o in ranked]
    for option in ranked:
        option.pop("proposal_index", None)
    return {
        "remaining": remaining,
        "options": ranked,
        "proposals": chosen,
        "reply": menu_reply(ranked, remaining, used_ai),
    }


def menu_reply(options: List[Dict[str, Any]], remaining: Dict[str, int], used_ai: bool) -> str:
    """Plain reply built from backend numbers only."""
    if remaining["kcal"] > 0:
        head = f"You have about {remaining['kcal']} kcal and {max(remaining['protein'], 0)} g protein left today."
    else:
        head = "You're at or over today's calories, so keep this light."
    lines = [head, "", "Best picks from this menu (estimates, restaurant portions vary):", ""]
    for i, o in enumerate(options, 1):
        portion = f" ({o['portion']})" if o["portion"] else ""
        why = f" {o['why']}" if o["why"] else ""
        over = "" if o.get("fits") else " Over what's left."
        lines.append(f"{i}. **{o['name']}**{portion}: about {o['kcal']} kcal, {o['protein']} g protein.{why}{over}")
    if not used_ai:
        lines += ["", "Ranked by protein per calorie because the coaching model isn't available right now."]
    lines += ["", "Tap Log on the one you order."]
    return "\n".join(lines)


class MenuArgs(_Args):
    menu_text: str = Field(..., min_length=3, max_length=MAX_MENU_CHARS,
                           description="The restaurant or delivery menu text the user pasted")


async def suggest_tool(ctx: ToolContext, args: MenuArgs) -> Dict[str, Any]:
    result = await suggest(ctx.user_id, args.menu_text)
    return {
        "remaining": result["remaining"],
        "options": result["options"],
        # Picked up by the coach loop: shown as confirm cards and used as the reply.
        "propose": [("log_meal", p) for p in result["proposals"]],
        "reply": result["reply"],
    }


register(Tool("suggest_from_menu",
              "Pick the best 2-3 dishes from a pasted restaurant or delivery menu for what's left today.",
              "read", args=MenuArgs, run=suggest_tool))
