"""A warm-up for each training day in three phases, matched to what the day trains.

1. General pulse raiser: a few easy minutes of cardio to warm the body up
   (a bike before legs, a brisk treadmill walk before upper body; easy
   skipping or marching at home).
2. Dynamic mobility and activation: legs days loosen hips, knees and ankles
   and wake up the glutes; push days the shoulders and wrists; pull days the
   shoulders and shoulder blades.
3. Ramp-up sets: lighter sets of the first lift, the part that prepares the
   exact movement.

Only equipment the person has, and moves that load an injured joint are left
out. Built when a plan is shown, not stored, so older plans get one too.
"""
from typing import Dict, List, Optional, Sequence

from app.workouts import catalog, planner

WARM_UP_MINUTES = 8
# Two lighter sets of the first weighted lift, as a share of the working weight.
RAMP_UP_SETS = [{"percent": 50, "reps": 10}, {"percent": 75, "reps": 5}]
# A bodyweight first exercise: one slow, easy set (no weight to take off).
EASY_SET = [{"percent": None, "reps": 5}]

GYM = {"full_gym"}
# Phase 1 options, best first: (move id, or None for a move with no catalogue
# entry; its name then; dose; joints it loads; equipment it needs).
PULSE: Dict[str, List[tuple]] = {
    "lower": [
        ("Bicycling_Stationary", None, "3 to 5 min, easy pace", set(), GYM),
        ("Walking_Treadmill", None, "3 to 5 min, brisk walk", set(), GYM),
    ],
    # A treadmill or a bike is in almost every gym; a rower or elliptical often isn't.
    "upper": [
        ("Walking_Treadmill", None, "3 to 5 min, brisk walk, swing your arms", set(), GYM),
        ("Bicycling_Stationary", None, "3 to 5 min, easy pace", set(), GYM),
    ],
    # The foundation phase: no jumping, just walking or marching.
    "foundation": [
        ("Walking_Treadmill", None, "3 to 5 min, easy walk", set(), GYM),
        (None, "March on the spot", "3 min, easy pace, hold a chair or wall if you need to", set(), None),
    ],
    "home": [
        ("Fast_Skipping", None, "2 min, easy pace", {"knee", "ankle"}, None),
        (None, "March on the spot", "2 to 3 min, brisk, swing your arms", set(), None),
    ],
}
PULSE_FOR_KIND = {"lower": "lower", "legs": "lower", "push": "upper", "pull": "upper",
                  "upper": "upper", "full": "upper", "foundation": "foundation"}

# Phase 2 moves: id -> (dose, joints it puts load on, equipment it needs).
MOVES: Dict[str, tuple] = {
    "Arm_Circles": ("20 s each way", set(), None),
    "Shoulder_Circles": ("10 each way", set(), None),
    "Wrist_Circles": ("10 each way", set(), None),
    "Elbow_Circles": ("10 each way", set(), None),
    "Cat_Stretch": ("8 slow reps", set(), None),
    "Inchworm": ("5 reps", {"wrist", "shoulder"}, None),
    "Scapular_Pull-Up": ("8 reps", {"shoulder"}, {"pull_up_bar", "full_gym"}),
    "Standing_Hip_Circles": ("10 each way, each leg", set(), None),
    "Knee_Circles": ("10 each way", set(), None),
    "Ankle_Circles": ("10 each way, each foot", set(), None),
    "Worlds_Greatest_Stretch": ("3 each side", {"hip"}, None),
    "Butt_Lift_Bridge": ("10 reps", set(), None),
    "Bodyweight_Squat": ("10 slow reps", {"knee"}, None),
}

# What each kind of day loosens and wakes up, in order.
ROUTINES: Dict[str, List[str]] = {
    "push": ["Arm_Circles", "Shoulder_Circles", "Wrist_Circles", "Cat_Stretch", "Inchworm"],
    "pull": ["Arm_Circles", "Shoulder_Circles", "Elbow_Circles", "Cat_Stretch", "Scapular_Pull-Up"],
    "upper": ["Arm_Circles", "Shoulder_Circles", "Wrist_Circles", "Cat_Stretch", "Inchworm", "Scapular_Pull-Up"],
    "lower": ["Standing_Hip_Circles", "Knee_Circles", "Ankle_Circles", "Worlds_Greatest_Stretch",
              "Butt_Lift_Bridge", "Bodyweight_Squat"],
    "full": ["Arm_Circles", "Standing_Hip_Circles", "Worlds_Greatest_Stretch", "Inchworm",
             "Butt_Lift_Bridge", "Bodyweight_Squat"],
}
ROUTINES["legs"] = ROUTINES["lower"]
# Standing, gentle and joint-friendly: nothing on the floor, nothing loaded.
ROUTINES["foundation"] = ["Arm_Circles", "Shoulder_Circles", "Wrist_Circles", "Standing_Hip_Circles", "Ankle_Circles"]

LOWER_PATTERNS = {"squat", "hinge", "lunge", "glute", "calf", "knee_flexion", "knee_extension"}
UPPER_PATTERNS = {"push_horizontal", "push_vertical", "chest_fly", "pull_horizontal", "pull_vertical",
                  "shoulder_isolation", "rear_delt", "biceps", "triceps"}
PUSH_PATTERNS = {"push_horizontal", "push_vertical", "chest_fly", "shoulder_isolation", "triceps"}
LABEL_TO_KIND = {label: kind for kind, label in planner.SESSION_LABELS.items()}


def day_kind(day: dict) -> Optional[str]:
    """push, pull, upper, lower, legs or full; from the day's label, else its exercises."""
    kind = LABEL_TO_KIND.get(day.get("focus") or "")
    if kind in ROUTINES:
        return kind
    patterns = {e.get("pattern") for e in day.get("exercises", [])}
    lower, upper = bool(patterns & LOWER_PATTERNS), bool(patterns & UPPER_PATTERNS)
    if lower and upper:
        return "full"
    if lower:
        return "lower"
    if upper:
        return "push" if patterns & UPPER_PATTERNS <= PUSH_PATTERNS else "upper"
    return None


def _move(exercise_id: Optional[str], name: Optional[str], dose: str) -> Optional[dict]:
    exercise = catalog.get(exercise_id) if exercise_id else None
    if exercise_id and exercise is None:
        return None
    return {
        "exercise_id": exercise.id if exercise else None,
        "name": exercise.name if exercise else name,
        "dose": dose,
        "image": exercise.image_urls()[0] if exercise and exercise.images else None,
    }


def _pulse(kind: str, owned: set, joints: set) -> List[dict]:
    """Phase 1: the first option the person has kit for and that spares their injuries."""
    group = PULSE_FOR_KIND[kind]
    options = PULSE[group] if group == "foundation" else PULSE[group] + PULSE["home"]
    for exercise_id, name, dose, loads, needs in options:
        if loads & joints or (needs and not needs & owned):
            continue
        move = _move(exercise_id, name, dose)
        if move:
            return [move]
    return []


def _mobility(kind: str, owned: set, joints: set) -> List[dict]:
    """Phase 2: the day's moves, minus any that load an injured joint or need missing kit."""
    moves = []
    for move_id in ROUTINES[kind]:
        dose, loads, needs = MOVES[move_id]
        if loads & joints or (needs and not needs & owned):
            continue
        move = _move(move_id, None, dose)
        if move:
            moves.append(move)
    return moves


def _ramp_up(exercises: List[dict]) -> Optional[dict]:
    """Phase 3: two lighter sets of the first weighted lift, or one easy set of a bodyweight one."""
    for entry in exercises:
        exercise = catalog.get(entry.get("exercise_id") or "")
        if catalog.is_loaded(exercise):
            return {"exercise_id": exercise.id, "name": entry.get("name") or exercise.name, "sets": RAMP_UP_SETS}
    first = exercises[0] if exercises else None
    if first and first.get("pattern") not in ("core", "mobility"):
        return {"exercise_id": first.get("exercise_id"), "name": first.get("name"), "sets": EASY_SET}
    return None


def for_day(day: dict, owned: Sequence[str], joints: set) -> Optional[dict]:
    """The three-phase warm-up for a strength day, or None (rest, mobility, quick sessions)."""
    exercises = day.get("exercises") or []
    if day.get("workout_type") != "strength" or not exercises or day.get("quick"):
        return None
    kind = day_kind(day)
    if kind is None:
        return None
    owned_set = set(owned)
    return {
        "minutes": WARM_UP_MINUTES,
        "pulse": _pulse(kind, owned_set, joints),
        "mobility": _mobility(kind, owned_set, joints),
        "ramp_up": _ramp_up(exercises),
    }
