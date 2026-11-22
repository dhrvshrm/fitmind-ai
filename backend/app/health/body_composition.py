"""Body composition scans (InBody, Tanita and similar bioimpedance machines).

What a scan holds, how it is read from a printout, and what it means for
training. The analysis is plain rules, not AI, so every finding can be
explained:

- Body fat categories: American Council on Exercise (ACE) body fat chart.
- Visceral fat level: 10 or more is flagged as high, the cut-off InBody
  printouts themselves use.
- Segmental lean mass: InBody prints each segment as a percentage of the
  standard for the person's height and weight; under 90% is "under" and over
  110% is "over" on its own bar chart.
- Imbalance: a left/right lean mass difference above 6% is treated as worth
  training one side at a time (an app rule, kept conservative).

A scan is never a diagnosis; it guides training and targets.
"""
import re
from typing import Dict, List, Optional

from pydantic import BaseModel, Field, model_validator

SEGMENTS = ("right_arm", "left_arm", "trunk", "right_leg", "left_leg")

# ACE body fat categories: upper bound of each band, by sex.
ACE_BANDS = {
    "male": [(5, "essential"), (13, "athletic"), (17, "fitness"), (24, "average")],
    "female": [(13, "essential"), (20, "athletic"), (24, "fitness"), (31, "average")],
}
HIGH_VISCERAL_LEVEL = 10
SEGMENT_UNDER = 90
SEGMENT_OVER = 110
IMBALANCE_SHARE = 0.06
# Arms and legs this many points apart (as % of standard) means one lags.
REGION_GAP_POINTS = 10


class Segment(BaseModel):
    """One body segment: lean mass and its % of standard, fat mass and its %."""

    lean_kg: Optional[float] = Field(default=None, ge=0, le=80)
    lean_percent: Optional[float] = Field(default=None, ge=20, le=250)
    fat_kg: Optional[float] = Field(default=None, ge=0, le=80)
    fat_percent: Optional[float] = Field(default=None, ge=0, le=900)


class BodyScan(BaseModel):
    """A scan's values. Every field is optional: printouts differ by machine."""

    measured_at: Optional[str] = Field(default=None, description="YYYY-MM-DD")
    device: Optional[str] = Field(default=None, max_length=80)
    weight_kg: Optional[float] = Field(default=None, ge=20, le=300)
    skeletal_muscle_mass_kg: Optional[float] = Field(default=None, ge=5, le=100)
    body_fat_mass_kg: Optional[float] = Field(default=None, ge=0.5, le=200)
    body_fat_percent: Optional[float] = Field(default=None, ge=3, le=75)
    fat_free_mass_kg: Optional[float] = Field(default=None, ge=10, le=150)
    total_body_water_l: Optional[float] = Field(default=None, ge=10, le=100)
    protein_kg: Optional[float] = Field(default=None, ge=1, le=40)
    minerals_kg: Optional[float] = Field(default=None, ge=0.5, le=10)
    visceral_fat_level: Optional[float] = Field(default=None, ge=1, le=30)
    bmr_kcal: Optional[float] = Field(default=None, ge=600, le=4000)
    score: Optional[float] = Field(default=None, ge=0, le=120)
    segments: Dict[str, Segment] = Field(default_factory=dict)

    @model_validator(mode="after")
    def _fill_derived(self) -> "BodyScan":
        """Work out what follows from what was printed (fat % from fat mass and weight, and back)."""
        self.segments = {k: v for k, v in self.segments.items() if k in SEGMENTS}
        w, fat, pbf = self.weight_kg, self.body_fat_mass_kg, self.body_fat_percent
        if w and fat and pbf is None:
            self.body_fat_percent = round(fat / w * 100, 1)
        elif w and pbf and fat is None:
            self.body_fat_mass_kg = round(w * pbf / 100, 1)
        if w and self.body_fat_mass_kg and self.fat_free_mass_kg is None:
            self.fat_free_mass_kg = round(w - self.body_fat_mass_kg, 1)
        return self

    def has_values(self) -> bool:
        main = (self.weight_kg, self.skeletal_muscle_mass_kg, self.body_fat_percent, self.visceral_fat_level)
        return any(v is not None for v in main) or bool(self.segments)


# ---------------------------------------------------------------------------
# Reading a printout's text (text PDFs); photos go to AI.
# ---------------------------------------------------------------------------
_NUM = r"(\d{1,3}(?:\.\d+)?)"
LOCAL_FIELDS = {
    "weight_kg": re.compile(r"\bweight\b[^\d\n]{0,25}" + _NUM, re.I),
    "skeletal_muscle_mass_kg": re.compile(r"skeletal\s+muscle\s+mass[^\d\n]{0,25}" + _NUM + r"|\bSMM\b[^\d\n]{0,10}" + _NUM, re.I),
    "body_fat_mass_kg": re.compile(r"body\s+fat\s+mass[^\d\n]{0,25}" + _NUM, re.I),
    "body_fat_percent": re.compile(r"(?:percent\s+body\s+fat|body\s+fat\s*(?:%|percent(?:age)?)|\bPBF\b)[^\d\n]{0,25}" + _NUM, re.I),
    "fat_free_mass_kg": re.compile(r"fat\s+free\s+mass[^\d\n]{0,25}" + _NUM, re.I),
    "total_body_water_l": re.compile(r"total\s+body\s+water[^\d\n]{0,25}" + _NUM, re.I),
    "visceral_fat_level": re.compile(r"visceral\s+fat\s+level[^\d\n]{0,25}" + _NUM, re.I),
    "bmr_kcal": re.compile(r"(?:basal\s+metabolic\s+rate|\bBMR\b)[^\d\n]{0,25}(\d{3,4})", re.I),
    "score": re.compile(r"inbody\s+score[^\d\n]{0,25}" + _NUM, re.I),
}


def sanitize(raw: dict) -> dict:
    """A scan from read values, keeping only fields that are plausible.

    A misread (a reference range or a pound value taken as kg) is dropped on
    its own rather than throwing the whole scan away.
    """
    clean: dict = {}
    for field, value in raw.items():
        if value is None or field == "segments":
            continue
        try:
            BodyScan(**{field: value})
            clean[field] = value
        except ValueError:
            continue
    segments = {}
    for name, values in (raw.get("segments") or {}).items():
        if name not in SEGMENTS or not isinstance(values, dict):
            continue
        kept = {}
        for key, value in values.items():
            try:
                Segment(**{key: value})
                if value is not None:
                    kept[key] = value
            except ValueError:
                continue
        if kept:
            segments[name] = kept
    return BodyScan(**clean, segments=segments).model_dump(exclude_none=True)


def extract_local(text: str) -> dict:
    """Values found by their printed labels; segment tables are left to AI."""
    found: dict = {}
    for field, pattern in LOCAL_FIELDS.items():
        match = pattern.search(text)
        if match:
            found[field] = float(next(g for g in match.groups() if g is not None))
    return sanitize(found)


class AISegment(BaseModel):
    segment: str = Field(description="right_arm, left_arm, trunk, right_leg or left_leg")
    lean_kg: Optional[float] = None
    lean_percent: Optional[float] = None
    fat_kg: Optional[float] = None
    fat_percent: Optional[float] = None


class AIBodyScan(BaseModel):
    """What the AI returns: loose on purpose, checked by :func:`sanitize`."""

    measured_at: Optional[str] = None
    device: Optional[str] = None
    weight_kg: Optional[float] = None
    skeletal_muscle_mass_kg: Optional[float] = None
    body_fat_mass_kg: Optional[float] = None
    body_fat_percent: Optional[float] = None
    fat_free_mass_kg: Optional[float] = None
    total_body_water_l: Optional[float] = None
    protein_kg: Optional[float] = None
    minerals_kg: Optional[float] = None
    visceral_fat_level: Optional[float] = None
    bmr_kcal: Optional[float] = None
    score: Optional[float] = None
    segments: List[AISegment] = Field(default_factory=list, max_length=10)

    def as_raw(self) -> dict:
        raw = self.model_dump(exclude={"segments"})
        raw["segments"] = {s.segment.strip().lower().replace(" ", "_"): s.model_dump(exclude={"segment"})
                           for s in self.segments}
        return raw


AI_SYSTEM = (
    "You read body composition analysis printouts (InBody, Tanita and similar) and copy the "
    "numbers exactly as printed. Never estimate or add values that are not on the sheet."
)
AI_PROMPT = (
    "Read this body composition result sheet. Copy, when printed: test date (YYYY-MM-DD), "
    "device name, weight (kg), skeletal muscle mass (kg), body fat mass (kg), percent body fat, "
    "fat free mass (kg), total body water (L), protein (kg), minerals (kg), visceral fat level, "
    "basal metabolic rate (kcal) and the InBody score. From the segmental lean analysis, for "
    "right arm, left arm, trunk, right leg and left leg: lean mass in kg and its percentage of "
    "standard; from the segmental fat analysis the fat mass in kg and its percentage. Convert "
    "pounds to kg if the sheet uses pounds. Leave out anything not printed."
)


# ---------------------------------------------------------------------------
# Analysis
# ---------------------------------------------------------------------------
def fat_category(percent: Optional[float], sex: Optional[str]) -> Optional[str]:
    """ACE band for a body fat percentage: essential, athletic, fitness, average or high."""
    if percent is None:
        return None
    # Without a recorded sex the men's bands are used (the more cautious "high" line).
    bands = ACE_BANDS["female"] if (sex or "").lower() == "female" else ACE_BANDS["male"]
    for upper, name in bands:
        if percent <= upper:
            return name
    return "high"


def segment_status(percent: Optional[float]) -> Optional[str]:
    if percent is None:
        return None
    if percent < SEGMENT_UNDER:
        return "under"
    if percent > SEGMENT_OVER:
        return "over"
    return "normal"


def _weaker(right: Optional[Segment], left: Optional[Segment]) -> Optional[dict]:
    """The weaker side when left and right lean mass differ by more than the cut-off."""
    if not right or not left or not right.lean_kg or not left.lean_kg:
        return None
    high, low = max(right.lean_kg, left.lean_kg), min(right.lean_kg, left.lean_kg)
    gap = (high - low) / high
    if gap <= IMBALANCE_SHARE:
        return None
    return {"side": "left" if left.lean_kg < right.lean_kg else "right", "gap_percent": round(gap * 100, 1)}


def _average(values: List[Optional[float]]) -> Optional[float]:
    present = [v for v in values if v is not None]
    return sum(present) / len(present) if present else None


def analyse(scan: BodyScan, sex: Optional[str]) -> dict:
    """What a scan says, as findings (each with a code and the numbers behind it) and a training focus.

    ``training`` is what the workout planner takes: areas that get dedicated
    work, the weaker side of an unbalanced limb, and whether to add easy
    conditioning.
    """
    findings: List[dict] = []
    areas: List[str] = []
    weaker: Dict[str, str] = {}

    category = fat_category(scan.body_fat_percent, sex)
    if category:
        findings.append({"code": f"body_fat_{category}", "values": {"percent": scan.body_fat_percent}})
    visceral_high = scan.visceral_fat_level is not None and scan.visceral_fat_level >= HIGH_VISCERAL_LEVEL
    if visceral_high:
        findings.append({"code": "visceral_high", "values": {"level": scan.visceral_fat_level}})

    seg = scan.segments
    for limb, right, left in (("arm", "right_arm", "left_arm"), ("leg", "right_leg", "left_leg")):
        found = _weaker(seg.get(right), seg.get(left))
        if found:
            weaker[limb] = found["side"]
            findings.append({"code": f"{limb}_imbalance", "values": found})

    status = {name: segment_status(s.lean_percent) for name, s in seg.items()}
    arms_pct = _average([seg[s].lean_percent for s in ("right_arm", "left_arm") if s in seg])
    legs_pct = _average([seg[s].lean_percent for s in ("right_leg", "left_leg") if s in seg])
    arms_under = any(status.get(s) == "under" for s in ("right_arm", "left_arm"))
    legs_under = any(status.get(s) == "under" for s in ("right_leg", "left_leg"))
    arms_lag = arms_pct is not None and legs_pct is not None and legs_pct - arms_pct >= REGION_GAP_POINTS
    legs_lag = arms_pct is not None and legs_pct is not None and arms_pct - legs_pct >= REGION_GAP_POINTS
    if arms_under or arms_lag:
        findings.append({"code": "arms_lagging", "values": {"percent": round(arms_pct) if arms_pct else None}})
    if legs_under or legs_lag:
        findings.append({"code": "legs_lagging", "values": {"percent": round(legs_pct) if legs_pct else None}})
    if status.get("trunk") == "under":
        findings.append({"code": "trunk_lagging", "values": {"percent": round(seg["trunk"].lean_percent)}})

    if arms_under or arms_lag or "arm" in weaker:
        areas.append("arms")
    if legs_under or legs_lag or "leg" in weaker:
        areas.append("legs")
    if status.get("trunk") == "under":
        areas.append("trunk")
    if not findings and scan.has_values():
        findings.append({"code": "balanced", "values": {}})

    return {
        "body_fat_category": category,
        "segment_status": status,
        "findings": findings,
        "training": {"areas": areas, "weaker": weaker, "conditioning": category == "high" or visceral_high},
    }


def goal_advice(analysis: dict, goal: Optional[str]) -> Optional[dict]:
    """A better-suited goal when the scan and the chosen goal pull apart, else None.

    - Building muscle (a calorie surplus) with high body fat or visceral fat:
      recomposition builds muscle on a small deficit while the fat comes down,
      instead of adding more fat first.
    - Losing fat or recomposing when body fat is already in the essential range:
      a deficit then mostly costs muscle and recovery, so building muscle on a
      small surplus fits better.

    Only a suggestion: the person decides, and the plan follows their goal.
    """
    category = analysis.get("body_fat_category")
    visceral_high = any(f["code"] == "visceral_high" for f in analysis.get("findings", []))
    if goal == "muscle_gain" and (category == "high" or visceral_high):
        return {"goal": goal, "suggested": "recomposition", "reason": "surplus_with_high_fat"}
    if goal in ("fat_loss", "recomposition") and category == "essential":
        return {"goal": goal, "suggested": "muscle_gain", "reason": "deficit_when_very_lean"}
    return None


def changes(current: BodyScan, previous: Optional[BodyScan]) -> Dict[str, float]:
    """How the main numbers moved since the previous scan."""
    if previous is None:
        return {}
    out = {}
    for field in ("weight_kg", "skeletal_muscle_mass_kg", "body_fat_mass_kg", "body_fat_percent", "visceral_fat_level"):
        now, before = getattr(current, field), getattr(previous, field)
        if now is not None and before is not None:
            out[field] = round(now - before, 1)
    return out
