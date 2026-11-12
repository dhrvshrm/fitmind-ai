"""Short desk mobility and posture routines built from the exercise catalogue.

Every step points at a curated catalogue exercise, so names, photos, steps,
cues and mistakes come from the same place as workouts (``catalog.get``).
Each routine fits the time on its label; ``seconds`` is the hold for the
whole step (both sides together when ``per_side``). All moves can be done in
work clothes, seated or standing beside a desk, without lying on the floor.
"""
from typing import Dict, List, Optional

from app.workouts import catalog

# (exercise id, seconds for the whole step)
_ROUTINES: List[dict] = [
    {
        "id": "wrists_forearms",
        "name": "Wrists and forearms",
        "description": "For keyboard, mouse and phone-heavy days.",
        "minutes": 2,
        "focus": "wrists",
        "steps": [("Wrist_Circles", 40), ("Kneeling_Forearm_Stretch", 40), ("Shoulder_Circles", 40)],
    },
    {
        "id": "neck_upper_back",
        "name": "Neck and upper back",
        "description": "Eases a stiff neck and rounded shoulders from screen time.",
        "minutes": 5,
        "focus": "neck",
        "steps": [
            ("Chin_To_Chest_Stretch", 40),
            ("Side_Neck_Stretch", 60),
            ("Shoulder_Circles", 40),
            ("Upper_Back_Stretch", 40),
            ("Elbows_Back", 40),
            ("Chair_Lower_Back_Stretch", 60),
        ],
    },
    {
        "id": "hips_hamstrings",
        "name": "Hips and hamstrings",
        "description": "Opens the hips and the back of the legs after long sitting.",
        "minutes": 5,
        "focus": "hips",
        "steps": [
            ("Standing_Hip_Flexors", 60),
            ("Chair_Leg_Extended_Stretch", 60),
            ("Standing_Hamstring_and_Calf_Stretch", 60),
            ("Upward_Stretch", 40),
            ("Standing_Hip_Flexors", 60),
        ],
    },
    {
        "id": "standing_reset",
        "name": "Standing reset",
        "description": "A full-body break: loosen up, open the chest, wake the legs.",
        "minutes": 10,
        "focus": "full_body",
        "steps": [
            ("Arm_Circles", 40),
            ("Shoulder_Circles", 40),
            ("Upward_Stretch", 40),
            ("Elbows_Back", 40),
            ("Side_Neck_Stretch", 60),
            ("Side_Wrist_Pull", 60),
            ("Standing_Hip_Flexors", 60),
            ("Standing_Hamstring_and_Calf_Stretch", 60),
            ("Bodyweight_Squat", 45),
            ("Shoulder_Stretch", 60),
            ("Wrist_Circles", 40),
            ("Chin_To_Chest_Stretch", 40),
        ],
    },
]
_BY_ID: Dict[str, dict] = {r["id"]: r for r in _ROUTINES}
ROUTINE_IDS = tuple(_BY_ID)


def _step(exercise_id: str, seconds: int) -> dict:
    exercise = catalog.get(exercise_id)
    if exercise is None:
        raise ValueError(f"desk routine uses unknown exercise {exercise_id}")
    per_side = bool(exercise.coaching and exercise.coaching.per_side)
    cues = exercise.coaching.cues if exercise.coaching else []
    return {
        "exercise_id": exercise.id,
        "name": exercise.name,
        "seconds": seconds,
        "per_side": per_side,
        "image": exercise.image_urls()[0] if exercise.images else None,
        "images": exercise.image_urls(),
        "cue": cues[0] if cues else None,
        "joints": list(exercise.coaching.loads) if exercise.coaching else [],
    }


def _routine(raw: dict, joints: Optional[set] = None) -> dict:
    steps = [_step(exercise_id, seconds) for exercise_id, seconds in raw["steps"]]
    skipped = 0
    if joints:
        kept = [s for s in steps if not set(s["joints"]) & joints]
        skipped = len(steps) - len(kept)
        steps = kept
    return {
        "id": raw["id"],
        "name": raw["name"],
        "description": raw["description"],
        "minutes": raw["minutes"],
        "focus": raw["focus"],
        "total_seconds": sum(s["seconds"] for s in steps),
        "skipped_for_injury": skipped,
        "steps": steps,
    }


def list_routines(injuries: Optional[List[str]] = None) -> List[dict]:
    """All routines, leaving out moves that load an injured joint."""
    joints = catalog.injured_joints(injuries or [])
    return [_routine(r, joints) for r in _ROUTINES]


def get_routine(routine_id: str, injuries: Optional[List[str]] = None) -> Optional[dict]:
    raw = _BY_ID.get(routine_id)
    return _routine(raw, catalog.injured_joints(injuries or [])) if raw else None


def routine_for_slot(index: int) -> dict:
    """Rotate through the short routines for successive break reminders."""
    short = [r for r in _ROUTINES if r["minutes"] <= 5]
    return short[index % len(short)]
