"""The health questionnaire: which conditions can be recorded and their follow-ups.

Follow-up questions only apply when relevant (``when`` names another answer
of the same condition and the values that make the question appear). Answers
to questions that don't apply are dropped, so stale follow-ups never linger.

Allergies and intolerances are already collected in onboarding (food
preferences) and are deliberately not duplicated here.
"""
from typing import Any, Dict, List, Optional

# Where a value came from. Missing information is never treated as "healthy".
PROVENANCE_SELF = "self_reported"
PROVENANCE_REPORT = "report"
PROVENANCES = (PROVENANCE_SELF, PROVENANCE_REPORT)

# condition key -> follow-up questions
CONDITIONS: Dict[str, List[Dict[str, Any]]] = {
    "diabetes": [
        {"key": "type", "kind": "choice",
         "options": ["type1", "type2", "prediabetes", "gestational", "unsure"]},
        {"key": "on_medication", "kind": "bool"},
        {"key": "uses_insulin", "kind": "bool", "when": {"on_medication": [True]}},
    ],
    "pcos": [
        {"key": "on_medication", "kind": "bool"},
    ],
    "thyroid": [
        {"key": "type", "kind": "choice", "options": ["hypothyroid", "hyperthyroid", "unsure"]},
        {"key": "on_medication", "kind": "bool"},
    ],
    "hypertension": [
        {"key": "on_medication", "kind": "bool"},
    ],
    "high_cholesterol": [
        {"key": "on_medication", "kind": "bool"},
    ],
    "kidney": [
        {"key": "type", "kind": "choice", "options": ["ckd", "kidney_stones", "other"]},
        {"key": "under_care", "kind": "bool"},
        {"key": "on_dialysis", "kind": "bool", "when": {"type": ["ckd"]}},
    ],
    "pregnancy": [
        {"key": "status", "kind": "choice", "options": ["pregnant", "breastfeeding"]},
        {"key": "trimester", "kind": "choice", "options": ["first", "second", "third"],
         "when": {"status": ["pregnant"]}},
    ],
    "digestive": [
        {"key": "type", "kind": "choice", "options": ["ibs", "acid_reflux", "ibd", "other"]},
    ],
}

CONDITION_KEYS = tuple(CONDITIONS)


def _applies(question: Dict[str, Any], answers: Dict[str, Any]) -> bool:
    when = question.get("when")
    if not when:
        return True
    return all(answers.get(key) in values for key, values in when.items())


def clean_details(condition: str, details: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """Keep only valid answers to follow-ups that apply.

    Raises:
        ValueError: for an unknown condition or an invalid answer.
    """
    if condition not in CONDITIONS:
        raise ValueError(f"Unknown condition: {condition}")
    details = details or {}
    cleaned: Dict[str, Any] = {}
    # Questions are ordered so a follow-up's ``when`` only refers to earlier answers.
    for question in CONDITIONS[condition]:
        key = question["key"]
        if key not in details or details[key] is None:
            continue
        value = details[key]
        if question["kind"] == "bool" and not isinstance(value, bool):
            raise ValueError(f"{condition}.{key} must be yes or no")
        if question["kind"] == "choice" and value not in question["options"]:
            raise ValueError(f"{condition}.{key} has an unknown option")
        if _applies(question, cleaned):
            cleaned[key] = value
    unknown = set(details) - {q["key"] for q in CONDITIONS[condition]}
    if unknown:
        raise ValueError(f"Unknown follow-up for {condition}: {', '.join(sorted(unknown))}")
    return cleaned
