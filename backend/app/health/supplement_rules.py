"""Rule-based safety flags and personal relevance for supplements.

Safety flags come from the health profile, confirmed lab values and food
answers. They never forbid anything outright; they say "talk to your doctor
first" (``doctor_first``), "be careful" (``caution``) or add context (``info``).
Reasons say why a supplement is commonly used by people like this user.
Nothing here prescribes: amounts in the catalogue are typical amounts only.

Rule sources: NIH ODS fact sheets (interactions, upper limits), ISSN position
stands (creatine, caffeine, protein), ACOG Committee Opinion 462 (caffeine in
pregnancy under 200 mg/day), KDOQI 2020 (protein in kidney disease).
"""
from typing import Any, Dict, List, Optional, Set

DOCTOR_FIRST = "doctor_first"
CAUTION = "caution"
INFO = "info"

PROTEIN_POWDERS = ("whey_protein", "plant_protein")
MINERALS_APART_FROM_THYROID_MEDS = ("iron", "calcium", "magnesium", "multivitamin")
NO_FISH_DIETS = ("vegetarian", "eggetarian", "vegan", "jain")
LOW_B12_RISK_DIETS = ("vegetarian", "vegan", "jain", "eggetarian")
STRENGTH_GOALS = ("muscle_gain", "recomposition", "athletic_performance", "build_muscle")
PROTEIN_GOALS = STRENGTH_GOALS + ("fat_loss", "lose_weight")
HEAVY_TRAINING_DAYS = 5
DAIRY_WORDS = ("dairy", "milk", "lactose", "whey", "casein")


def _flag(code: str, severity: str, message: str) -> Dict[str, str]:
    return {"code": code, "severity": severity, "message": message}


def _avoids_dairy(prefs: Dict[str, Any]) -> bool:
    if prefs.get("diet_type") == "vegan" or prefs.get("eats_dairy") is False:
        return True
    terms = [t.lower() for t in (prefs.get("allergies") or []) + (prefs.get("intolerances") or [])]
    return any(word in term for term in terms for word in DAIRY_WORDS)


def safety_flags(supplement_id: str, flags: Set[str], prefs: Dict[str, Any],
                 age: Optional[int]) -> List[Dict[str, str]]:
    """Safety notes for one supplement for this user, most serious first."""
    out: List[Dict[str, str]] = []
    if age is not None and age < 18:
        if supplement_id in ("creatine_monohydrate", "caffeine", "ashwagandha"):
            out.append(_flag("minor", DOCTOR_FIRST, "Not advised for under-18s unless a doctor recommends it."))
        else:
            out.append(_flag("minor", DOCTOR_FIRST, "Under 18: check with a doctor or parent before taking supplements."))

    if "pregnancy" in flags:
        messages = {
            "ashwagandha": "Not recommended during pregnancy or breastfeeding.",
            "caffeine": "During pregnancy, keep all caffeine (tea and coffee included) under 200 mg a day.",
            "creatine_monohydrate": "There's little safety research in pregnancy; talk to your doctor first.",
        }
        out.append(_flag("pregnancy", DOCTOR_FIRST, messages.get(
            supplement_id, "During pregnancy or breastfeeding, check every supplement with your doctor first.")))

    if "kidney" in flags:
        if supplement_id in PROTEIN_POWDERS or supplement_id == "creatine_monohydrate":
            out.append(_flag("kidney", DOCTOR_FIRST,
                             "With a kidney condition, protein and creatine should be agreed with your doctor."))
        elif supplement_id in ("magnesium", "electrolytes", "calcium"):
            out.append(_flag("kidney", DOCTOR_FIRST,
                             "Kidneys clear these minerals; ask your doctor before taking them."))

    if "blood_thinners" in flags and supplement_id in ("omega_3", "ashwagandha"):
        out.append(_flag("blood_thinners", DOCTOR_FIRST,
                         "You take a blood thinner. This can add to bleeding risk; check with your doctor first."))

    if "thyroid" in flags or "thyroid_medication" in flags:
        if supplement_id in MINERALS_APART_FROM_THYROID_MEDS and "thyroid_medication" in flags:
            out.append(_flag("thyroid_timing", CAUTION,
                             "Take this at least 4 hours apart from your thyroid medicine, which it can block."))
        if supplement_id == "ashwagandha":
            out.append(_flag("thyroid", DOCTOR_FIRST,
                             "Ashwagandha may change thyroid hormone levels; talk to your doctor first."))

    if "hypertension" in flags or "bp_medication" in flags:
        if supplement_id == "caffeine":
            out.append(_flag("blood_pressure", CAUTION, "Caffeine can raise blood pressure for a few hours."))
        if supplement_id == "electrolytes":
            out.append(_flag("blood_pressure", CAUTION,
                             "Many electrolyte products are high in sodium; check with your doctor."))
        if supplement_id == "ashwagandha" and "bp_medication" in flags:
            out.append(_flag("bp_medication", CAUTION, "May add to the effect of blood pressure medicine."))

    if supplement_id == "ashwagandha" and ({"diabetes_medication", "insulin"} & flags):
        out.append(_flag("diabetes_medication", CAUTION, "May add to the effect of diabetes medicine."))

    if supplement_id == "iron":
        if "high_ferritin" in flags:
            out.append(_flag("iron_high", DOCTOR_FIRST,
                             "Your confirmed ferritin was above the usual range. Don't take iron unless your doctor says so."))
        elif not ({"low_ferritin", "low_iron", "low_haemoglobin"} & flags):
            out.append(_flag("iron_test", CAUTION, "Only take iron if a blood test shows you need it."))
    if supplement_id == "vitamin_d3" and "high_vitamin_d" in flags:
        out.append(_flag("vitamin_d_high", DOCTOR_FIRST,
                         "Your confirmed vitamin D was above the usual range; talk to your doctor before taking more."))

    if supplement_id == "whey_protein" and _avoids_dairy(prefs):
        out.append(_flag("dairy", CAUTION, "Whey is made from milk, which you've said you avoid. Plant protein is dairy-free."))
    if supplement_id == "omega_3" and prefs.get("diet_type") in NO_FISH_DIETS:
        out.append(_flag("vegetarian_source", INFO, "Fish oil isn't vegetarian; algae oil gives the same EPA and DHA."))

    order = {DOCTOR_FIRST: 0, CAUTION: 1, INFO: 2}
    return sorted(out, key=lambda f: order[f["severity"]])


def _fmt(item: Optional[dict]) -> str:
    if not item:
        return ""
    return f" ({item['value']:g} {item['unit']} on {item['measured_at']})"


def reasons(supplement_id: str, flags: Set[str], prefs: Dict[str, Any], goal: Optional[str],
            targets: Optional[Dict[str, Any]], latest: Dict[str, dict], workout_days: Optional[int],
            serving_protein: Optional[float]) -> List[str]:
    """Why this supplement is commonly used by people in this user's situation."""
    out: List[str] = []
    diet = prefs.get("diet_type")
    if supplement_id in PROTEIN_POWDERS and goal in PROTEIN_GOALS and targets:
        out.append(f"Your protein target is {targets.get('protein')} g a day; a scoop adds about "
                   f"{serving_protein or 20:g} g if meals fall short.")
        if supplement_id == "plant_protein" and _avoids_dairy(prefs):
            out.append("It's dairy-free, which fits your diet.")
    if supplement_id == "creatine_monohydrate" and goal in STRENGTH_GOALS and (workout_days or 0) > 0:
        out.append("It has strong evidence for strength gains with the training you do.")
    if supplement_id == "vitamin_d3" and "low_vitamin_d" in flags:
        out.append(f"Your confirmed vitamin D{_fmt(latest.get('vitamin_d'))} was below the usual range.")
    if supplement_id == "vitamin_b12":
        if diet in LOW_B12_RISK_DIETS:
            out.append("B12 comes mainly from animal foods, so it's commonly low on your diet.")
        if "low_vitamin_b12" in flags:
            out.append(f"Your confirmed B12{_fmt(latest.get('vitamin_b12'))} was below the usual range.")
        if "diabetes_medication" in flags:
            out.append("Metformin can lower B12 over time; ask your doctor whether to check it.")
    if supplement_id == "omega_3":
        if diet in NO_FISH_DIETS:
            out.append("You don't eat fish, the main food source of EPA and DHA.")
        if "high_triglycerides" in flags:
            out.append(f"Your confirmed triglycerides{_fmt(latest.get('triglycerides'))} were above the usual "
                       "range; higher omega-3 doses are sometimes used for this under a doctor's care.")
    if supplement_id == "iron" and ({"low_ferritin", "low_haemoglobin", "low_iron"} & flags):
        marker = next(c for c in ("ferritin", "haemoglobin", "iron") if f"low_{c}" in flags)
        out.append(f"Your confirmed {marker}{_fmt(latest.get(marker))} was below the usual range. "
                   "Ask your doctor whether iron is right for you.")
    if supplement_id == "calcium" and _avoids_dairy(prefs):
        out.append("You avoid dairy, a main calcium source in Indian diets.")
    if supplement_id == "caffeine" and goal == "athletic_performance":
        out.append("It has strong evidence for endurance performance.")
    if supplement_id == "electrolytes" and (workout_days or 0) >= HEAVY_TRAINING_DAYS:
        out.append("You train most days; long, sweaty sessions can call for more than water.")
    return out
