"""Registry of the coach's tools and context blocks.

Tools come in two kinds:

- **read** tools run as soon as the model asks for them and return facts.
- **action** tools change the user's data. They never run when the model asks:
  ``prepare`` computes, with backend code, exactly what would change and
  returns a :class:`Proposal`. Only when the user taps confirm does ``execute``
  run, with the stored payload (never the model's numbers), and its
  :class:`ActionResult` message is what the user is told.

Adding a tool is one call to :func:`register`; adding a block of context to the
coach's system prompt is one call to :func:`register_context`. ``user_id``
always comes from the authenticated session, never from tool arguments.
"""
import inspect
import json
from dataclasses import dataclass, field
from typing import Any, Awaitable, Callable, Dict, List, Literal, Optional, Type, Union

from pydantic import BaseModel, ConfigDict

ToolKind = Literal["read", "action"]

# Query domains the frontend refreshes after an action (see the coach's
# invalidation map in the frontend). Keep these names stable.
Domain = Literal["nutrition", "dietPlan", "workouts", "recovery", "dashboard", "gamification"]


class NoArgs(BaseModel):
    """For tools that take no arguments."""

    model_config = ConfigDict(extra="ignore")


class ToolError(Exception):
    """A tool can't do what was asked; the message is shown to the model/user."""


class Change(BaseModel):
    """One line on a confirm card, e.g. ``Calories: 420 kcal``."""

    label: str
    value: str


class Proposal(BaseModel):
    """What an action would do, worked out by the backend before confirming."""

    title: str
    summary: str
    changes: List[Change] = []
    # Everything ``execute`` needs; stored server-side, never sent back by the client.
    payload: Dict[str, Any] = {}
    estimate: bool = False


class ActionResult(BaseModel):
    """The backend's account of what an executed action changed."""

    message: str
    data: Dict[str, Any] = {}


@dataclass
class ToolContext:
    """Who a tool runs for. Built from the authenticated session."""

    user_id: str


ReadFn = Callable[[ToolContext, Any], Awaitable[Dict[str, Any]]]
PrepareFn = Callable[[ToolContext, Any], Awaitable[Proposal]]
ExecuteFn = Callable[[ToolContext, Dict[str, Any]], Awaitable[ActionResult]]


@dataclass
class Tool:
    name: str
    description: str
    kind: ToolKind
    args: Type[BaseModel] = NoArgs
    # read tools
    run: Optional[ReadFn] = None
    # action tools
    prepare: Optional[PrepareFn] = None
    execute: Optional[ExecuteFn] = None
    invalidates: List[str] = field(default_factory=list)

    def __post_init__(self) -> None:
        if self.kind == "read" and self.run is None:
            raise ValueError(f"read tool {self.name} needs run")
        if self.kind == "action" and (self.prepare is None or self.execute is None):
            raise ValueError(f"action tool {self.name} needs prepare and execute")

    def describe(self) -> str:
        """Compact description for the model's tool list."""
        schema = self.args.model_json_schema()
        props = {
            k: {kk: vv for kk, vv in v.items() if kk in ("type", "enum", "description", "minimum", "maximum")}
            for k, v in schema.get("properties", {}).items()
        }
        required = schema.get("required", [])
        args = json.dumps({"properties": props, "required": required}, separators=(",", ":"))
        return f"- {self.name} [{self.kind}]: {self.description} args={args}"


TOOLS: Dict[str, Tool] = {}


def register(tool: Tool) -> Tool:
    """Add (or replace) a tool in the registry."""
    TOOLS[tool.name] = tool
    return tool


def get(name: str) -> Optional[Tool]:
    return TOOLS.get(name)


def catalog() -> str:
    """Every tool, one per line, for the system prompt."""
    return "\n".join(t.describe() for t in TOOLS.values())


# ---------------------------------------------------------------------------
# Context blocks
# ---------------------------------------------------------------------------
ContextFn = Callable[[str], Union[Awaitable[Optional[str]], Optional[str]]]

CONTEXT_BLOCKS: List[ContextFn] = []


def register_context(fn: ContextFn) -> ContextFn:
    """Add a context block: ``fn(user_id)`` returns text (or None) for the prompt.

    Sync and async functions both work, so an existing helper such as
    ``health_context`` can be registered directly.
    """
    if fn not in CONTEXT_BLOCKS:
        CONTEXT_BLOCKS.append(fn)
    return fn


async def build_context(user_id: str) -> str:
    """Run every context block; a failing block is skipped, not fatal."""
    import logging

    lines: List[str] = []
    for fn in CONTEXT_BLOCKS:
        try:
            value = fn(user_id)
            if inspect.isawaitable(value):
                value = await value
        except Exception as e:  # One broken block shouldn't take the coach down.
            logging.getLogger(__name__).warning("Coach context block %s failed: %s", fn, e)
            continue
        if value:
            lines.append(str(value).strip())
    return "\n".join(lines)
