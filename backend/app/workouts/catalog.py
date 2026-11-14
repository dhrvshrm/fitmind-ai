"""Exercise catalogue: free-exercise-db plus FitMind's curated coaching layer.

- ``data/exercises.json``: 820 exercises from free-exercise-db (public
  domain), built by ``scripts/import_exercises.py`` at a pinned commit.
- ``data/curated.json``: the core exercises plans use, with movement
  pattern, joints loaded, equipment needed, coaching notes, stabiliser
  muscles and corrections to errors in the source data.

Plans only use curated exercises. The full catalogue is searchable in the
exercise library.
"""
import json
import logging
from functools import lru_cache
from pathlib import Path
from typing import Dict, Iterable, List, Literal, Optional, Sequence

from pydantic import BaseModel, field_validator

from app.nutrition.text import normalize

logger = logging.getLogger(__name__)

DATA_DIR = Path(__file__).parent / "data"
SOURCE_COMMIT = "f00c92c7dcf1216a928a52c3706c7ce8e2f71ed5"
IMAGE_BASE = f"https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@{SOURCE_COMMIT}/exercises/"
SOURCE_NAME = "free-exercise-db"

MUSCLES = frozenset({
    "abdominals", "abductors", "adductors", "biceps", "calves", "chest", "forearms", "glutes",
    "hamstrings", "lats", "lower back", "middle back", "neck", "quadriceps", "shoulders", "traps",
    "triceps",
})
JOINTS = frozenset({"knee", "hip", "lower_back", "shoulder", "elbow", "wrist", "ankle", "neck"})
EQUIPMENT_KEYS = frozenset({
    "bodyweight", "dumbbells", "barbell", "kettlebell", "resistance_bands", "pull_up_bar", "bench",
    "cardio_machine", "full_gym",
})
Pattern = Literal[
    "squat", "hinge", "lunge", "glute", "calf", "knee_flexion", "knee_extension",
    "push_horizontal", "push_vertical", "pull_horizontal", "pull_vertical", "shoulder_isolation",
    "rear_delt", "biceps", "triceps", "core", "cardio", "mobility",
]


class Coaching(BaseModel):
    """The curated layer for one exercise."""

    pattern: Pattern
    unit: Literal["reps", "seconds"]
    per_side: bool
    needs: List[str]
    loads: List[str]
    stabilizers: List[str]
    grip: str
    stance: str
    steps: List[str]
    cues: List[str]
    mistakes: List[str]
    breathing: str
    easier: Optional[str] = None
    harder: Optional[str] = None
    # Fixed reps for explosive exercises (swings, jumps), whatever the goal.
    rep_range: Optional[List[int]] = None
    video_url: Optional[str] = None
    reviewed: bool = False

    @field_validator("needs")
    @classmethod
    def _known_equipment(cls, value: List[str]) -> List[str]:
        unknown = {k for need in value for k in need.split("|")} - EQUIPMENT_KEYS
        if unknown:
            raise ValueError(f"unknown equipment {sorted(unknown)}")
        return value

    @field_validator("loads")
    @classmethod
    def _known_joints(cls, value: List[str]) -> List[str]:
        if set(value) - JOINTS:
            raise ValueError(f"unknown joints {sorted(set(value) - JOINTS)}")
        return value

    @field_validator("stabilizers")
    @classmethod
    def _known_muscles(cls, value: List[str]) -> List[str]:
        if set(value) - MUSCLES:
            raise ValueError(f"unknown muscles {sorted(set(value) - MUSCLES)}")
        return value


class Exercise(BaseModel):
    id: str
    name: str
    force: Optional[str] = None
    level: str
    mechanic: Optional[str] = None
    equipment: Optional[str] = None
    category: str
    primary_muscles: List[str]
    secondary_muscles: List[str]
    instructions: List[str]
    images: List[str]
    coaching: Optional[Coaching] = None

    @property
    def curated(self) -> bool:
        return self.coaching is not None

    def image_urls(self) -> List[str]:
        return [IMAGE_BASE + path for path in self.images]

    def summary(self) -> dict:
        """What lists and plans show: name, muscles, equipment, first photo."""
        return {
            "id": self.id,
            "name": self.name,
            "force": self.force,
            "level": self.level,
            "mechanic": self.mechanic,
            "equipment": self.equipment,
            "category": self.category,
            "primary_muscles": self.primary_muscles,
            "secondary_muscles": self.secondary_muscles,
            "image": self.image_urls()[0] if self.images else None,
            "curated": self.curated,
            "pattern": self.coaching.pattern if self.coaching else None,
        }

    def detail(self) -> dict:
        """Everything the exercise page shows."""
        coaching = self.coaching.model_dump() if self.coaching else None
        return {
            **self.summary(),
            "images": self.image_urls(),
            # Curated steps replace the source text, which has some outdated cues.
            "instructions": coaching["steps"] if coaching else self.instructions,
            "stabilizers": coaching["stabilizers"] if coaching else [],
            "coaching": coaching,
            "source": SOURCE_NAME,
        }


@lru_cache(maxsize=1)
def _catalog() -> Dict[str, Exercise]:
    raw = json.loads((DATA_DIR / "exercises.json").read_text(encoding="utf-8"))
    curated = json.loads((DATA_DIR / "curated.json").read_text(encoding="utf-8"))["exercises"]
    by_id = {e["id"]: e for e in raw}
    for entry in curated:
        entry = dict(entry)
        exercise_id = entry.pop("id")
        fixes = entry.pop("fixes", {})
        if exercise_id not in by_id:
            raise ValueError(f"curated exercise {exercise_id} isn't in the catalogue")
        by_id[exercise_id] = {**by_id[exercise_id], **fixes, "coaching": Coaching(**entry)}
    catalog = {key: Exercise(**value) for key, value in by_id.items()}
    for exercise in catalog.values():
        if exercise.coaching:
            for link in (exercise.coaching.easier, exercise.coaching.harder):
                if link and not (link in catalog and catalog[link].curated):
                    raise ValueError(f"{exercise.id} links to {link}, which isn't curated")
    logger.info("Loaded %d exercises (%d curated)", len(catalog), len(curated))
    return catalog


def get(exercise_id: str) -> Optional[Exercise]:
    return _catalog().get(exercise_id)


def curated() -> List[Exercise]:
    return [e for e in _catalog().values() if e.curated]


def search(
    query: Optional[str] = None,
    muscle: Optional[str] = None,
    equipment: Optional[str] = None,
    curated_only: bool = False,
    limit: int = 40,
) -> List[Exercise]:
    """Exercises matching all given filters; curated ones first, then by name."""
    words = normalize(query).split() if query else []
    results = []
    for exercise in _catalog().values():
        if curated_only and not exercise.curated:
            continue
        if muscle and muscle not in exercise.primary_muscles + exercise.secondary_muscles:
            continue
        if equipment and exercise.equipment != equipment:
            continue
        if words and not all(w in normalize(exercise.name) for w in words):
            continue
        results.append(exercise)
    results.sort(key=lambda e: (not e.curated, e.name))
    return results[:limit]


# --- Who can do what ---------------------------------------------------------------
LEVEL_RANK = {"beginner": 0, "intermediate": 1, "expert": 2}
EXPERIENCE_LEVEL = {"beginner": "beginner", "intermediate": "intermediate", "advanced": "expert"}

# Injury words people type -> joints to protect.
INJURY_JOINTS: Dict[str, str] = {
    "knee": "knee", "knees": "knee", "acl": "knee", "meniscus": "knee",
    "back": "lower_back", "lower back": "lower_back", "spine": "lower_back", "disc": "lower_back",
    "slip disc": "lower_back", "sciatica": "lower_back",
    "shoulder": "shoulder", "rotator": "shoulder",
    "elbow": "elbow", "tennis elbow": "elbow",
    "wrist": "wrist", "carpal": "wrist",
    "hip": "hip", "ankle": "ankle", "neck": "neck", "cervical": "neck",
}


def injured_joints(injuries: Iterable[str]) -> set:
    """Joints to protect, from free-text injuries ("Lower back", "knee pain")."""
    joints = set()
    for injury in injuries:
        text = f" {normalize(injury)} "
        joints |= {joint for word, joint in INJURY_JOINTS.items() if f" {word} " in text}
    return joints


# Source equipment that can be loaded with more weight over time.
LOADED_EQUIPMENT = frozenset({"dumbbell", "barbell", "cable", "machine", "kettlebells"})


def is_loaded(exercise: Optional["Exercise"]) -> bool:
    """True when weight can be added (dumbbells, barbell, cable, machine), not bodyweight or bands."""
    return bool(exercise and exercise.equipment in LOADED_EQUIPMENT)


def has_equipment(exercise: Exercise, owned: Sequence[str]) -> bool:
    """True if every item the exercise needs is available (a full gym has everything)."""
    if exercise.coaching is None:
        return False
    owned_set = set(owned)
    if "full_gym" in owned_set:
        return True
    return all(any(option in owned_set for option in need.split("|")) for need in exercise.coaching.needs)


def allowed(exercise: Exercise, owned: Sequence[str], joints: set, level: str) -> bool:
    """Curated, possible with the equipment, safe for injuries, and within the person's level."""
    return (
        exercise.curated
        and has_equipment(exercise, owned)
        and not (set(exercise.coaching.loads) & joints)
        and LEVEL_RANK.get(exercise.level, 0) <= LEVEL_RANK.get(level, 0)
    )
