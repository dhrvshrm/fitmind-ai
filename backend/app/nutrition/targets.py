"""Daily calorie, macro, fiber and water targets, computed deterministically.

Targets come from formulas, never from AI, so they're predictable and can be
explained line by line. Every adjustment is recorded as a note (a code plus
its numbers) that the app turns into plain-language explanations.

Method:
- BMR: Mifflin-St Jeor, or Katch-McArdle when body fat % is known.
- TDEE: BMR x activity factor.
- Goal: a percentage deficit or surplus, capped so weight loss stays under
  about 1% of body weight per week and gain stays modest.
- Safety: no deficit for under-18s or during pregnancy/breastfeeding, and
  calories never go below 1,200 kcal (women) or 1,500 kcal (men), the usual
  limits for dieting without medical supervision.
- Protein: grams per kg for the goal (0.83 g/kg ICMR-NIN baseline up to
  2.2 g/kg), using a reference weight at BMI 25 when BMI is high.
- Fat: 25% of calories (at least 0.6 g/kg); carbs fill the rest.
- Fiber: 14 g per 1,000 kcal. Water: 35 ml/kg, plus 500 ml on a heavy
  training schedule.
"""
from typing import Dict, List, Literal, Optional

from pydantic import BaseModel

Goal = Literal[
    "fat_loss", "muscle_gain", "recomposition", "maintain", "general_fitness", "athletic_performance"
]
Pace = Literal["gentle", "moderate", "aggressive"]
ActivityLevel = Literal["sedentary", "light", "moderate", "active", "very_active"]
ReproductiveStatus = Literal["none", "pregnant", "breastfeeding", "unknown"]

# Older onboarding stored these goal ids; they map onto the current set.
LEGACY_GOALS: Dict[str, Goal] = {
    "lose_weight": "fat_loss",
    "build_muscle": "muscle_gain",
    "improve_endurance": "athletic_performance",
}

ACTIVITY_FACTORS: Dict[str, float] = {
    "sedentary": 1.2,
    "light": 1.375,
    "moderate": 1.55,
    "active": 1.725,
    "very_active": 1.9,
}
DEFAULT_ACTIVITY = "moderate"

# Share of TDEE removed (fat loss) or added (gain) at each pace.
DEFICIT_BY_PACE = {"gentle": 0.10, "moderate": 0.20, "aggressive": 0.25}
SURPLUS_BY_PACE = {"gentle": 0.05, "moderate": 0.10, "aggressive": 0.15}
RECOMP_DEFICIT = 0.07
MAX_SURPLUS_KCAL = 500
# Fat loss faster than ~1% of body weight a week costs muscle and is hard to sustain.
MAX_WEEKLY_LOSS_FRACTION = 0.01
KCAL_PER_KG_FAT = 7700

# Never prescribe below these, whatever the maths says.
CALORIE_FLOOR = {"male": 1500, "female": 1200, "other": 1200}

PROTEIN_PER_KG: Dict[str, float] = {
    "fat_loss": 1.8,
    "muscle_gain": 1.8,
    "recomposition": 2.0,
    "athletic_performance": 1.6,
    "maintain": 1.2,
    "general_fitness": 1.2,
}
PROTEIN_MIN_PER_KG = 0.83  # ICMR-NIN 2024 adult RDA.
PROTEIN_MAX_PER_KG = 2.2
MINOR_PROTEIN_PER_KG = 1.0
# Pregnancy and breastfeeding raise protein needs moderately; goal multipliers
# don't apply, and the app recommends a doctor's advice for specifics.
EXPECTING_PROTEIN_PER_KG = 1.2
REFERENCE_BMI = 25
HIGH_BMI = 27

FAT_SHARE = 0.25
FAT_MIN_PER_KG = 0.6
FIBER_PER_1000_KCAL = 14
WATER_ML_PER_KG = 35
HEAVY_TRAINING_DAYS = 4
EXTRA_WATER_ML = 500

KCAL_PER_G = {"protein": 4, "carbs": 4, "fat": 9}


class TargetInputs(BaseModel):
    age: int
    gender: str
    weight_kg: float
    height_cm: float
    goal: str = "general_fitness"
    pace: Optional[Pace] = None
    activity_level: Optional[str] = None
    body_fat_percent: Optional[float] = None
    reproductive_status: Optional[ReproductiveStatus] = None
    workout_days_per_week: Optional[int] = None


class TargetNote(BaseModel):
    """One step of the calculation; the app renders ``code`` with ``values``."""

    code: str
    values: Dict[str, float | str] = {}


class Targets(BaseModel):
    calories: int
    protein: int
    carbs: int
    fats: int
    fiber: int
    water_ml: int
    bmr: int
    tdee: int
    goal: str
    adjustment_kcal: int
    protein_per_kg: float
    notes: List[TargetNote]
    flags: List[str]


def canonical_goal(goal: Optional[str]) -> Goal:
    """Map legacy or missing goal ids onto the current set."""
    if not goal:
        return "general_fitness"
    goal = LEGACY_GOALS.get(goal, goal)
    return goal if goal in PROTEIN_PER_KG else "general_fitness"  # type: ignore[return-value]


def _bmr(inputs: TargetInputs, notes: List[TargetNote]) -> float:
    bf = inputs.body_fat_percent
    if bf is not None and 3 <= bf <= 60:
        lean_mass = inputs.weight_kg * (1 - bf / 100)
        bmr = 370 + 21.6 * lean_mass
        notes.append(TargetNote(code="bmr_katch", values={"bmr": round(bmr), "lean_mass": round(lean_mass, 1)}))
        return bmr
    base = 10 * inputs.weight_kg + 6.25 * inputs.height_cm - 5 * inputs.age
    sex = inputs.gender.lower()
    # Mifflin-St Jeor: +5 for men, -161 for women; the midpoint when not specified.
    offset = 5 if sex == "male" else -161 if sex == "female" else -78
    bmr = base + offset
    notes.append(TargetNote(code="bmr_mifflin", values={"bmr": round(bmr)}))
    return bmr


def _adjustment(inputs: TargetInputs, goal: Goal, tdee: float, notes: List[TargetNote], flags: List[str]) -> float:
    pace = inputs.pace or "moderate"
    if goal == "fat_loss":
        deficit = tdee * DEFICIT_BY_PACE[pace]
        max_deficit = inputs.weight_kg * MAX_WEEKLY_LOSS_FRACTION * KCAL_PER_KG_FAT / 7
        if deficit > max_deficit:
            deficit = max_deficit
            flags.append("deficit_capped")
        notes.append(TargetNote(code="deficit", values={
            "pace": pace, "kcal": round(deficit),
            "kg_per_week": round(deficit * 7 / KCAL_PER_KG_FAT, 2),
        }))
        return -deficit
    if goal == "muscle_gain":
        surplus = min(tdee * SURPLUS_BY_PACE[pace], MAX_SURPLUS_KCAL)
        notes.append(TargetNote(code="surplus", values={"pace": pace, "kcal": round(surplus)}))
        return surplus
    if goal == "recomposition":
        deficit = tdee * RECOMP_DEFICIT
        notes.append(TargetNote(code="recomp", values={"kcal": round(deficit)}))
        return -deficit
    notes.append(TargetNote(code="maintenance"))
    return 0.0


def calculate_targets(inputs: TargetInputs) -> Targets:
    """Compute daily targets and the reasoning behind them."""
    notes: List[TargetNote] = []
    flags: List[str] = []
    goal = canonical_goal(inputs.goal)
    sex = inputs.gender.lower() if inputs.gender.lower() in CALORIE_FLOOR else "other"
    minor = inputs.age < 18
    expecting = inputs.reproductive_status in ("pregnant", "breastfeeding")

    bmr = _bmr(inputs, notes)
    level = inputs.activity_level if inputs.activity_level in ACTIVITY_FACTORS else DEFAULT_ACTIVITY
    if inputs.activity_level not in ACTIVITY_FACTORS:
        flags.append("activity_assumed")
    factor = ACTIVITY_FACTORS[level]
    tdee = bmr * factor
    notes.append(TargetNote(code="activity", values={"level": level, "factor": factor, "tdee": round(tdee)}))

    adjustment = _adjustment(inputs, goal, tdee, notes, flags)
    if adjustment < 0 and (minor or expecting):
        adjustment = 0
        flags.append("no_deficit_minor" if minor else "no_deficit_pregnancy")
    if adjustment > 0 and expecting:
        adjustment = 0
        flags.append("no_deficit_pregnancy")

    calories = tdee + adjustment
    floor = CALORIE_FLOOR[sex]
    if calories < floor:
        calories = floor
        flags.append("calorie_floor")
        notes.append(TargetNote(code="floor", values={"kcal": round(floor)}))

    # Protein: use a reference weight at BMI 25 when BMI is high, so the
    # target reflects lean mass rather than total weight.
    height_m = inputs.height_cm / 100
    bmi = inputs.weight_kg / (height_m ** 2)
    reference_weight = inputs.weight_kg
    if bmi > HIGH_BMI and inputs.body_fat_percent is None:
        reference_weight = REFERENCE_BMI * height_m ** 2
        flags.append("protein_reference_weight")
    if expecting:
        per_kg = EXPECTING_PROTEIN_PER_KG
    elif minor:
        per_kg = MINOR_PROTEIN_PER_KG
    else:
        per_kg = PROTEIN_PER_KG[goal]
    per_kg = min(max(per_kg, PROTEIN_MIN_PER_KG), PROTEIN_MAX_PER_KG)
    protein = per_kg * reference_weight
    notes.append(TargetNote(code="protein", values={
        "per_kg": per_kg, "weight": round(reference_weight, 1), "grams": round(protein),
    }))

    fat = max(calories * FAT_SHARE / KCAL_PER_G["fat"], FAT_MIN_PER_KG * inputs.weight_kg)
    carbs = max(
        (calories - protein * KCAL_PER_G["protein"] - fat * KCAL_PER_G["fat"]) / KCAL_PER_G["carbs"],
        0,
    )
    notes.append(TargetNote(code="macros", values={"fat_share": FAT_SHARE}))

    fiber = calories / 1000 * FIBER_PER_1000_KCAL
    water = inputs.weight_kg * WATER_ML_PER_KG
    if (inputs.workout_days_per_week or 0) >= HEAVY_TRAINING_DAYS:
        water += EXTRA_WATER_ML
    water = round(water / 250) * 250

    if minor:
        flags.append("minor")
    if expecting:
        flags.append("pregnancy_or_breastfeeding")

    return Targets(
        calories=round(calories),
        protein=round(protein),
        carbs=round(carbs),
        fats=round(fat),
        fiber=round(fiber),
        water_ml=int(water),
        bmr=round(bmr),
        tdee=round(tdee),
        goal=goal,
        adjustment_kcal=round(calories - tdee),
        protein_per_kg=per_kg,
        notes=notes,
        flags=flags,
    )
