"""How hard an exercise is to learn, its range of motion, and the training terms around it.

- Skill demand: ``easy`` (machines, cables, simple moves), ``moderate`` (free-weight
  basics), ``technical`` (barbell lifts, swings, pull-ups, anything that needs
  coaching or base strength first). Beginners get easy and moderate picks first,
  so a first week in a full gym is a leg press and a chest press machine, not a
  barbell bench and a deadlift.
- Range of motion (ROM): a cue for the full range of every exercise, and which
  exercises load the muscle at long lengths ("loads the stretch"); training there
  grows muscle at least as well as the short range (Maeo et al. 2021, Pedrosa et
  al. 2022, Wolf et al. 2023 meta-analysis).
- Lengthened partials as an intensity technique for trained lifters. (Ramp-up
  sets before the first lift live in warm_up.py.)
"""
from typing import Dict, Optional

from app.workouts.catalog import Exercise

SKILL_EASY = "easy"
SKILL_MODERATE = "moderate"
SKILL_TECHNICAL = "technical"
SKILL_RANK = {SKILL_EASY: 0, SKILL_MODERATE: 1, SKILL_TECHNICAL: 2}

# Exceptions to the equipment rule below.
SKILL_OVERRIDES: Dict[str, str] = {
    # Bodyweight moves a first-timer can do with good form.
    "Bodyweight_Squat": SKILL_EASY, "Incline_Push-Up": SKILL_EASY, "Glute_Kickback": SKILL_EASY,
    "Superman": SKILL_EASY, "Scapular_Pull-Up": SKILL_EASY, "Band_Seated_Row": SKILL_EASY,
    # The classic first loaded lifts: simple, stable and easy to coach.
    "Goblet_Squat": SKILL_EASY, "Dumbbell_Floor_Press": SKILL_EASY, "Dumbbell_Bench_Press": SKILL_EASY,
    "One-Arm_Dumbbell_Row": SKILL_EASY, "Incline_Dumbbell_Press": SKILL_EASY,
    # Need base strength or coaching before they are safe or even possible.
    "Chin-Up": SKILL_TECHNICAL, "Pullups": SKILL_TECHNICAL, "Handstand_Push-Ups": SKILL_TECHNICAL,
    "Natural_Glute_Ham_Raise": SKILL_TECHNICAL, "Ab_Roller": SKILL_TECHNICAL,
    "One-Arm_Kettlebell_Swings": SKILL_TECHNICAL, "Kettlebell_One-Legged_Deadlift": SKILL_TECHNICAL,
    # Machines that still ask for bracing and a feel for the movement.
    "Lying_T-Bar_Row": SKILL_MODERATE,
}

# Exercises that load the muscle at its longest (the bottom of a curl on an incline,
# the stretch of an overhead extension, the bottom of a Romanian deadlift).
STRETCH_IDS = frozenset({
    "Incline_Dumbbell_Curl", "Preacher_Curl", "Machine_Preacher_Curls",
    "Triceps_Overhead_Extension_with_Rope", "Standing_Dumbbell_Triceps_Extension",
    "Kettlebell_Overhead_Triceps_Extension", "Backpack_Overhead_Triceps_Extension",
    "Dumbbell_One-Arm_Triceps_Extension", "EZ-Bar_Skullcrusher",
    "Romanian_Deadlift", "Stiff-Legged_Dumbbell_Deadlift", "Split_Squat_with_Dumbbells",
    "Seated_Leg_Curl", "Dumbbell_Flyes", "Cable_Crossover", "Butterfly",
    "Standing_Dumbbell_Calf_Raise", "Smith_Machine_Calf_Raise", "Hack_Squat", "Barbell_Squat",
    "Goblet_Squat", "Wide-Grip_Lat_Pulldown", "Decline_Push-Up",
})

# The full range, by movement pattern; a few exercises have their own.
ROM_BY_PATTERN: Dict[str, str] = {
    "squat": "Full range: thighs at least parallel to the floor, heels down, then stand all the way up.",
    "lunge": "Full range: back knee comes down close to the floor, front heel stays down.",
    "hinge": "Full range: push the hips back until you feel a strong hamstring stretch with a flat back, "
             "usually just below the knees.",
    "glute": "Full range: drive the hips up until they lock out in line with your body, pause, then lower.",
    "knee_flexion": "Full range: from legs nearly straight to heels as close to your seat as they go.",
    "push_horizontal": "Full range: lower until the weight is close to your chest (or your chest close to "
                       "the floor), then press to straight arms.",
    "push_vertical": "Full range: from hands at chin height to arms straight overhead.",
    "pull_horizontal": "Full range: arms straight at the start, then pull until your elbows pass your body.",
    "pull_vertical": "Full range: arms straight at the top, then pull until your hands or the bar reach your "
                     "upper chest.",
    "chest_fly": "Full range: open until you feel a stretch across the chest, elbows soft, then bring the "
                 "hands together.",
    "shoulder_isolation": "Full range: raise to shoulder height, no higher, and lower all the way under control.",
    "rear_delt": "Full range: arms out wide until in line with your shoulders, squeeze, then return slowly.",
    "biceps": "Full range: arm fully straight at the bottom, then curl all the way up without swinging.",
    "triceps": "Full range: from elbows fully bent to arms fully straight, upper arm still.",
    "calf": "Full range: heels drop below the step for a full stretch, then rise as high as you can; "
            "pause at both ends.",
}
ROM_OVERRIDES: Dict[str, str] = {
    "Leg_Press": "Full range: lower until your knees pass 90 degrees with your lower back still flat on the pad.",
    "Hack_Squat": "Full range: as deep as you can with your lower back flat on the pad, then stand all the way up.",
}

TECHNIQUE_LENGTHENED_PARTIALS = "lengthened_partials"


def skill_of(exercise: Exercise) -> str:
    """How much skill or base strength an exercise needs before it is safe."""
    if exercise.id in SKILL_OVERRIDES:
        return SKILL_OVERRIDES[exercise.id]
    equipment = exercise.equipment or ""
    if equipment in ("machine", "cable") or exercise.mechanic == "isolation":
        return SKILL_EASY
    if equipment in ("barbell", "kettlebells", "e-z curl bar"):
        return SKILL_TECHNICAL
    return SKILL_MODERATE


def loads_stretch(exercise: Exercise) -> bool:
    return exercise.id in STRETCH_IDS


def rom_cue(exercise: Exercise) -> Optional[str]:
    if exercise.coaching is None:
        return None
    return ROM_OVERRIDES.get(exercise.id) or ROM_BY_PATTERN.get(exercise.coaching.pattern)


def technique_for(exercise: Exercise, level: str) -> Optional[str]:
    """Lengthened partials on the last set: trained lifters, stretch-loading isolation work."""
    if level != "beginner" and loads_stretch(exercise) and exercise.mechanic == "isolation":
        return TECHNIQUE_LENGTHENED_PARTIALS
    return None
