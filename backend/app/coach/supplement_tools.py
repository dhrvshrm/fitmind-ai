"""Coach tools for supplements: what the user takes, what a supplement is, and ticking one off.

Facts come from the curated catalogue and the user's own list, personalised
with consented health data, so the coach never invents a dose or a claim.
"""
from typing import Any, Dict, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.coach.registry import ActionResult, Change, NoArgs, Proposal, Tool, ToolContext, ToolError, register
from app.models.user import User
from app.services import supplement_service
from app.services.supplement_service import SupplementError


class _Args(BaseModel):
    model_config = ConfigDict(extra="ignore")


async def my_supplements(ctx: ToolContext, _args: NoArgs) -> Dict[str, Any]:
    items = await supplement_service.list_user_supplements(ctx.user_id)
    return {
        "supplements": [
            {"id": s["id"], "name": s["name"], "dose": s.get("dose") or "", "timing": s.get("timing"),
             "taken_today": s["taken_today"], "adds_protein": bool(s.get("adds_to_nutrition"))}
            for s in items
        ],
    }


class InfoArgs(_Args):
    supplement_id: str = Field(..., description="Catalogue id, e.g. creatine_monohydrate, vitamin_d3, whey_protein")


async def supplement_info(ctx: ToolContext, args: InfoArgs) -> Dict[str, Any]:
    user = await User.get_by_id(ctx.user_id)
    if user is None:
        raise ToolError("Account not found")
    info = await supplement_service.supplement_info(args.supplement_id, user)
    if info is None:
        ids = ", ".join(e["id"] for e in supplement_service.catalog_entries())
        raise ToolError(f"Unknown supplement. Known ids: {ids}")
    return {
        "name": info["name"],
        "summary": info["summary"],
        "evidence": info["evidence"],
        "typical_dose": info["typical_dose"],
        "timing": info["timing"],
        "cautions": info["cautions"],
        "interactions": info["interactions"],
        "for_this_user": {"reasons": info["reasons"], "safety_flags": info["safety_flags"],
                          "doctor_first": info["doctor_first"]},
        "note": "General information, not a prescription. Suggest a doctor for anything flagged.",
    }


class TakenArgs(_Args):
    name: str = Field(..., description="The supplement's name as in the user's list, e.g. Creatine")


async def _find(user_id: str, name: str) -> Optional[dict]:
    wanted = name.strip().lower()
    items = await supplement_service.list_user_supplements(user_id)
    return next((s for s in items if s["name"].lower() == wanted), None) or next(
        (s for s in items if wanted in s["name"].lower() or s["name"].lower() in wanted), None
    )


async def prepare_taken(ctx: ToolContext, args: TakenArgs) -> Proposal:
    item = await _find(ctx.user_id, args.name)
    if item is None:
        raise ToolError("That isn't in the user's supplements. They can add it on the Health page.")
    if item["taken_today"]:
        raise ToolError(f"{item['name']} is already ticked off today.")
    changes = [Change(label="Supplement", value=item["name"] + (f" ({item['dose']})" if item.get("dose") else ""))]
    macros = item.get("macros_per_serving") or {}
    if macros:
        changes.append(Change(label="Adds to today", value=f"{round(macros['protein'])} g protein, "
                                                         f"{round(macros['calories'])} kcal"))
    return Proposal(title="Mark supplement as taken", summary=f"Ticks off {item['name']} for today.",
                    changes=changes, payload={"user_supplement_id": item["id"], "name": item["name"]})


async def execute_taken(ctx: ToolContext, payload: Dict[str, Any]) -> ActionResult:
    try:
        await supplement_service.mark_taken(ctx.user_id, payload["user_supplement_id"])
    except SupplementError as e:
        raise ToolError(str(e)) from e
    return ActionResult(message=f"Ticked off {payload['name']} for today.",
                        data={"user_supplement_id": payload["user_supplement_id"]})


register(Tool("get_my_supplements", "The supplements the user tracks and whether each is taken today.",
              "read", run=my_supplements))
register(Tool("get_supplement_info",
              "What a supplement is for, the evidence, typical dose, cautions and safety notes for this user.",
              "read", args=InfoArgs, run=supplement_info))
register(Tool("mark_supplement_taken", "Tick off a supplement the user says they took today.", "action",
              args=TakenArgs, prepare=prepare_taken, execute=execute_taken,
              invalidates=["supplements", "nutrition", "dashboard"]))
