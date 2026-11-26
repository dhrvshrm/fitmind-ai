"""The foundation phase: the first weeks for someone whose body isn't ready for training yet.

A beginner who is also very heavy, older or inactive (BMI 30 or more, 50 or
older, or sedentary) doesn't start on push-ups and squats. For the first
FOUNDATION_WEEKS they get:

- daily walking as the main workout, with a step target that starts low and
  grows each week (ACSM guidance for adults with obesity: build up to 150-300
  minutes of moderate activity a week, mostly walking);
- three short strength sessions a week on non-consecutive days, with
  joint-friendly moves (wall push-up, sit-to-stand from a chair, glute bridge,
  supported calf raise, dead bug) at an easy effort, 2 sets each;
- walking and mobility on the other days they chose, and at least one rest day.

Moves progress along ladders (wall push-up, then incline push-up, then push-up;
sit-to-stand, then bodyweight squat) once the top of the rep range is easy.
"""
from datetime import date, datetime
from typing import Optional

FOUNDATION_WEEKS = 6
FOUNDATION_STRENGTH_DAYS = (0, 2, 4)  # Monday, Wednesday, Friday
# Beginners who aren't in the foundation phase still get at most this many strength
# days; the rest of the days they picked become walking and mobility.
BEGINNER_MAX_STRENGTH_DAYS = 4

BMI_DECONDITIONED = 30
AGE_DECONDITIONED = 50
# A gentle "check with your doctor first" for the highest-risk starts.
BMI_DOCTOR_CHECK = 35
AGE_DOCTOR_CHECK = 50
AGE_DOCTOR_CHECK_ALONE = 65
BMI_DOCTOR_CHECK_ALONE = 40

# Steps: start low and add a little each week, up to the goal.
STEP_START = 4000
STEP_WEEKLY_INCREASE = 750
STEP_GOAL = 8000
WALK_MINUTES = 20

# Each strength slot: the best choice the person can do, first.
SLOTS = (
    ("push", ("Machine_Bench_Press", "Wall_Push-Up")),
    ("squat", ("Leg_Press", "Sit_To_Stand")),
    ("pull", ("Seated_Cable_Rows", "Band_Seated_Row", "One-Arm_Dumbbell_Row", "Backpack_Row")),
    ("glute", ("Butt_Lift_Bridge",)),
    ("calf", ("Standing_Calf_Raises",)),
    ("core", ("Dead_Bug",)),
)
# Moves only used in the foundation phase (everyone else starts a rung higher).
FOUNDATION_ONLY = frozenset({"Wall_Push-Up", "Sit_To_Stand"})

SETS = 2
REPS = "8-12"
REST = "90s"
RIR = 4
EFFORT = "Easy to moderate: stop while 3 or 4 more good reps would still be possible"


def bmi(weight_kg: Optional[float], height_cm: Optional[float]) -> Optional[float]:
    if not weight_kg or not height_cm:
        return None
    return weight_kg / (height_cm / 100) ** 2


def is_deconditioned(level: str, age: Optional[int], weight_kg: Optional[float],
                     height_cm: Optional[float], activity_level: Optional[str]) -> bool:
    """A beginner whose body isn't ready for push-ups and squats yet."""
    if level != "beginner":
        return False
    body_mass = bmi(weight_kg, height_cm)
    return bool(
        (body_mass is not None and body_mass >= BMI_DECONDITIONED)
        or (age is not None and age >= AGE_DECONDITIONED)
        or activity_level == "sedentary"
    )


def week_of(joined: Optional[datetime], today: date) -> Optional[int]:
    """Which foundation week today is (1-based), or None once the phase is over."""
    if joined is None:
        return 1
    start = joined.date() if isinstance(joined, datetime) else joined
    week = (today - start).days // 7 + 1
    return week if 1 <= week <= FOUNDATION_WEEKS else None


def step_target(week: int) -> int:
    return min(STEP_GOAL, STEP_START + STEP_WEEKLY_INCREASE * (week - 1))


def needs_doctor_check(age: Optional[int], weight_kg: Optional[float], height_cm: Optional[float]) -> bool:
    body_mass = bmi(weight_kg, height_cm) or 0
    age = age or 0
    return (
        (age >= AGE_DOCTOR_CHECK and body_mass >= BMI_DOCTOR_CHECK)
        or age >= AGE_DOCTOR_CHECK_ALONE
        or body_mass >= BMI_DOCTOR_CHECK_ALONE
    )


def week_for(user, experience: Optional[str], today: date) -> Optional[int]:
    """The foundation week a user is in (1-based), or None when the phase doesn't apply."""
    level = {"beginner": "beginner", "intermediate": "intermediate", "advanced": "expert"}.get(
        (experience or getattr(user, "experience_level", None) or "beginner").lower(), "beginner")
    if not is_deconditioned(level, getattr(user, "age", None), getattr(user, "weight_kg", None),
                            getattr(user, "height_cm", None), getattr(user, "activity_level", None)):
        return None
    return week_of(getattr(user, "created_at", None), today)
