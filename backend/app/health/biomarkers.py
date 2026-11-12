"""Canonical biomarkers: names, units, unit conversion and usual adult ranges.

Reference ranges are the commonly used adult ranges from the sources below.
Labs differ, so when a report prints its own range we keep and prefer that.
Ranges are for context only: a value outside them is something to discuss
with a doctor, never a diagnosis.

Sources (also listed in docs/DATA_SOURCES.md):
- ADA: American Diabetes Association, Standards of Care in Diabetes 2025,
  section 2 "Diagnosis and Classification" (HbA1c, fasting and 2-h glucose).
- NCEP ATP III: NHLBI, Third Report of the National Cholesterol Education
  Program (lipid panel cut-offs).
- ODS: NIH Office of Dietary Supplements fact sheets for vitamin D and B12
  (https://ods.od.nih.gov/factsheets/).
- WHO: Haemoglobin concentrations for the diagnosis of anaemia (WHO/NMH/NHD/MNM/11.1).
- MedlinePlus: U.S. National Library of Medicine lab test pages (TSH, free T4,
  ferritin, serum iron, B12, BUN, uric acid, calcium, haemoglobin upper limits).
- Mayo Clinic: Creatinine test and Liver function tests pages (creatinine,
  ALT, AST ranges).
- KDIGO: KDIGO 2024 Clinical Practice Guideline for CKD (eGFR categories).
"""
import re
from typing import Dict, List, Optional, Tuple

SOURCES = {
    "ADA": "American Diabetes Association, Standards of Care in Diabetes 2025",
    "NCEP": "NHLBI NCEP Adult Treatment Panel III",
    "ODS": "NIH Office of Dietary Supplements fact sheet",
    "WHO": "WHO haemoglobin thresholds for anaemia",
    "MedlinePlus": "MedlinePlus (U.S. National Library of Medicine)",
    "Mayo": "Mayo Clinic test reference",
    "KDIGO": "KDIGO 2024 CKD guideline",
}

# code -> definition. ``aliases`` are regexes matched case-insensitively on
# word boundaries; ``convert`` maps other units to the canonical one;
# ``plausible`` bounds catch misreads (e.g. a reference range read as a value).
BIOMARKERS: Dict[str, dict] = {
    "hba1c": {
        "name": "HbA1c", "unit": "%", "category": "blood_sugar",
        "aliases": [r"hba1c", r"hb\s*a1c", r"glycated\s+ha?emoglobin", r"glycosylated\s+ha?emoglobin", r"a1c"],
        "convert": {}, "plausible": (3, 20),
        "ref": {"high": 5.6}, "source": "ADA",
        "about": "Your average blood sugar over the past two to three months.",
    },
    "fasting_glucose": {
        "name": "Fasting glucose", "unit": "mg/dL", "category": "blood_sugar",
        "aliases": [r"fasting\s+(?:blood|plasma)?\s*(?:sugar|glucose)", r"fbs", r"fpg",
                    r"glucose[,\s]*fasting", r"(?:blood|plasma)\s+glucose\s*\(?\s*fasting"],
        "convert": {"mmol/l": 18.016}, "plausible": (30, 600),
        "ref": {"low": 70, "high": 99}, "source": "ADA",
        "about": "Blood sugar after not eating for at least eight hours.",
    },
    "pp_glucose": {
        "name": "Post-meal glucose", "unit": "mg/dL", "category": "blood_sugar",
        "aliases": [r"post\s*prandial\s+(?:blood|plasma)?\s*(?:sugar|glucose)", r"ppbs", r"pp\s+(?:blood\s+)?sugar",
                    r"glucose[,\s]*(?:post\s*prandial|pp)", r"2\s*-?\s*h(?:ou)?r?\s+(?:post\s*prandial\s+)?glucose"],
        "convert": {"mmol/l": 18.016}, "plausible": (30, 700),
        "ref": {"high": 139}, "source": "ADA",
        "about": "Blood sugar about two hours after a meal.",
    },
    "total_cholesterol": {
        "name": "Total cholesterol", "unit": "mg/dL", "category": "lipids",
        "aliases": [r"total\s+cholesterol", r"cholesterol[,\s]*total", r"serum\s+cholesterol", r"cholesterol"],
        "convert": {"mmol/l": 38.67}, "plausible": (50, 600),
        "ref": {"high": 199}, "source": "NCEP",
        "about": "All the cholesterol carried in your blood.",
    },
    "ldl": {
        "name": "LDL cholesterol", "unit": "mg/dL", "category": "lipids",
        "aliases": [r"ldl(?:[\s-]*c(?:holesterol)?)?(?:[,\s]*direct)?", r"low\s+density\s+lipoprotein"],
        "convert": {"mmol/l": 38.67}, "plausible": (10, 400),
        "ref": {"high": 99}, "source": "NCEP",
        "about": "Often called \"bad\" cholesterol; lower is generally better for the heart.",
    },
    "hdl": {
        "name": "HDL cholesterol", "unit": "mg/dL", "category": "lipids",
        "aliases": [r"(?<!non[\s-])hdl(?:[\s-]*c(?:holesterol)?)?(?:[,\s]*direct)?", r"high\s+density\s+lipoprotein"],
        "convert": {"mmol/l": 38.67}, "plausible": (5, 200),
        "ref": {"low": 40, "low_female": 50}, "source": "NCEP",
        "about": "Often called \"good\" cholesterol; it helps clear other cholesterol.",
    },
    "triglycerides": {
        "name": "Triglycerides", "unit": "mg/dL", "category": "lipids",
        "aliases": [r"triglycerides?", r"tgl?\b", r"s\.?\s*triglycerides?"],
        "convert": {"mmol/l": 88.57}, "plausible": (10, 3000),
        "ref": {"high": 149}, "source": "NCEP",
        "about": "A type of fat in the blood that rises with excess calories, sugar and alcohol.",
    },
    "tsh": {
        "name": "TSH", "unit": "mIU/L", "category": "thyroid",
        "aliases": [r"tsh", r"thyroid\s+stimulating\s+hormone", r"thyrotropin"],
        "convert": {"uiu/ml": 1.0, "miu/ml": 1000.0}, "plausible": (0.005, 150),
        "ref": {"low": 0.4, "high": 4.5}, "source": "MedlinePlus",
        "about": "A hormone from the pituitary gland that tells the thyroid how much to work.",
    },
    "free_t4": {
        "name": "Free T4", "unit": "ng/dL", "category": "thyroid",
        "aliases": [r"free\s+t4", r"ft4", r"free\s+thyroxine"],
        "convert": {"pmol/l": 1 / 12.87}, "plausible": (0.1, 10),
        "ref": {"low": 0.8, "high": 1.8}, "source": "MedlinePlus",
        "about": "The active, unbound form of the main thyroid hormone.",
    },
    "vitamin_d": {
        "name": "Vitamin D (25-OH)", "unit": "ng/mL", "category": "vitamins",
        "aliases": [r"25\s*-?\s*(?:\(\s*oh\s*\)|oh|hydroxy)\s*-?\s*vitamin\s*d\d?", r"vitamin\s*d\s*(?:total|3|2)?",
                    r"vit\.?\s*d\d?", r"25\s*-?\s*(?:\(\s*oh\s*\)|oh)\s*d"],
        "convert": {"nmol/l": 1 / 2.496}, "plausible": (2, 200),
        "ref": {"low": 20, "high": 50}, "source": "ODS",
        "about": "How much vitamin D your body has stored, from sunlight, food and supplements.",
    },
    "vitamin_b12": {
        "name": "Vitamin B12", "unit": "pg/mL", "category": "vitamins",
        "aliases": [r"vitamin\s*b\s*-?\s*12", r"vit\.?\s*b\s*-?\s*12", r"cobalamin", r"cyanocobalamin", r"b12"],
        "convert": {"pmol/l": 1.355}, "plausible": (30, 3000),
        "ref": {"low": 200, "high": 900}, "source": "MedlinePlus",
        "about": "A vitamin needed for nerves and red blood cells, found mainly in animal foods.",
    },
    "haemoglobin": {
        "name": "Haemoglobin", "unit": "g/dL", "category": "blood",
        "aliases": [r"ha?emoglobin", r"hb", r"hgb"],
        "convert": {"g/l": 0.1, "mmol/l": 1.611}, "plausible": (3, 25),
        "ref": {"low": 13.0, "high": 17.5, "low_female": 12.0, "high_female": 15.5}, "source": "WHO",
        "about": "The protein in red blood cells that carries oxygen.",
    },
    "ferritin": {
        "name": "Ferritin", "unit": "ng/mL", "category": "blood",
        "aliases": [r"ferritin", r"s\.?\s*ferritin"],
        "convert": {"ug/l": 1.0, "pmol/l": 1 / 2.247}, "plausible": (1, 5000),
        "ref": {"low": 24, "high": 336, "low_female": 11, "high_female": 307}, "source": "MedlinePlus",
        "about": "A protein that stores iron; it shows how much iron your body has in reserve.",
    },
    "iron": {
        "name": "Serum iron", "unit": "ug/dL", "category": "blood",
        "aliases": [r"(?:serum\s+)?iron(?!\s*binding)"],
        "convert": {"umol/l": 5.585}, "plausible": (5, 500),
        "ref": {"low": 60, "high": 170}, "source": "MedlinePlus",
        "about": "The amount of iron circulating in your blood right now.",
    },
    "creatinine": {
        "name": "Creatinine", "unit": "mg/dL", "category": "kidney",
        "aliases": [r"(?:serum\s+)?creatinine(?!\s*(?:kinase|clearance|ratio))", r"s\.?\s*creatinine"],
        "convert": {"umol/l": 1 / 88.4}, "plausible": (0.1, 20),
        "ref": {"low": 0.74, "high": 1.35, "low_female": 0.59, "high_female": 1.04}, "source": "Mayo",
        "about": "A waste product from muscles that the kidneys filter out.",
    },
    "egfr": {
        "name": "eGFR", "unit": "mL/min/1.73m2", "category": "kidney",
        "aliases": [r"e\s*-?\s*gfr", r"estimated\s+glomerular\s+filtration\s+rate"],
        "convert": {}, "plausible": (2, 200),
        "ref": {"low": 60}, "source": "KDIGO",
        "about": "An estimate of how well the kidneys filter blood.",
    },
    "urea": {
        "name": "Blood urea nitrogen", "unit": "mg/dL", "category": "kidney",
        "aliases": [r"blood\s+urea\s+nitrogen", r"bun"],
        "convert": {"mmol/l": 2.801}, "plausible": (1, 200),
        "ref": {"low": 6, "high": 24}, "source": "MedlinePlus",
        "about": "A waste product from protein breakdown that the kidneys remove.",
    },
    "uric_acid": {
        "name": "Uric acid", "unit": "mg/dL", "category": "kidney",
        "aliases": [r"(?:serum\s+)?uric\s+acid"],
        "convert": {"umol/l": 1 / 59.48}, "plausible": (0.5, 20),
        "ref": {"low": 3.5, "high": 7.2}, "source": "MedlinePlus",
        "about": "A waste product from breaking down purines, found in some foods.",
    },
    "alt": {
        "name": "ALT (SGPT)", "unit": "U/L", "category": "liver",
        "aliases": [r"alt", r"sgpt", r"alanine\s+(?:amino)?transaminase", r"alanine\s+aminotransferase"],
        "convert": {"iu/l": 1.0}, "plausible": (1, 3000),
        "ref": {"low": 7, "high": 55}, "source": "Mayo",
        "about": "A liver enzyme; higher levels can mean the liver is under strain.",
    },
    "ast": {
        "name": "AST (SGOT)", "unit": "U/L", "category": "liver",
        "aliases": [r"ast", r"sgot", r"aspartate\s+(?:amino)?transaminase", r"aspartate\s+aminotransferase"],
        "convert": {"iu/l": 1.0}, "plausible": (1, 3000),
        "ref": {"low": 8, "high": 48}, "source": "Mayo",
        "about": "An enzyme found in the liver and muscles.",
    },
    "calcium": {
        "name": "Calcium", "unit": "mg/dL", "category": "minerals",
        "aliases": [r"(?:serum\s+|total\s+)?calcium"],
        "convert": {"mmol/l": 4.008}, "plausible": (3, 20),
        "ref": {"low": 8.5, "high": 10.2}, "source": "MedlinePlus",
        "about": "A mineral for bones, muscles and nerves, tightly controlled in the blood.",
    },
}

# Lines that mention a marker but aren't its value (ratios, calculations).
_SKIP_LINE = re.compile(r"\bratio\b|\bnon[\s-]*hdl\b|\bvldl\b|\bbinding\b|\bsaturation\b", re.I)

_COMPILED: List[Tuple[str, "re.Pattern[str]"]] = [
    (code, re.compile(rf"(?<![a-z0-9]){alias}(?![a-z0-9])", re.I))
    for code, spec in BIOMARKERS.items()
    for alias in spec["aliases"]
]


def normalize_unit(unit: Optional[str]) -> str:
    """Lower-case unit without spaces, with micro signs spelled ``u``."""
    if not unit:
        return ""
    text = unit.strip().lower().replace(" ", "")
    for micro in ("µ", "μ", "mc"):
        text = text.replace(micro, "u")
    return text.replace("litre", "l").replace("liter", "l")


def find_code(text: str) -> Optional[Tuple[str, int]]:
    """The biomarker named in ``text`` and where its name ends, or None.

    The longest matching name wins, so "HDL cholesterol" isn't read as
    "cholesterol" and "glycated haemoglobin" isn't read as "haemoglobin".
    """
    if _SKIP_LINE.search(text):
        return None
    best: Optional[Tuple[str, int, int]] = None
    for code, pattern in _COMPILED:
        match = pattern.search(text)
        if match and (best is None or len(match.group(0)) > best[2]):
            best = (code, match.end(), len(match.group(0)))
    return (best[0], best[1]) if best else None


def code_for_name(name: str) -> Optional[str]:
    """The canonical code for a biomarker name, or None when it isn't one we know."""
    found = find_code(name)
    return found[0] if found else None


def to_canonical(code: str, value: float, unit: Optional[str]) -> Tuple[float, str, bool]:
    """Convert ``value`` to the biomarker's canonical unit.

    Returns (value, unit, converted_ok). ``converted_ok`` is False when the unit
    is unknown; the value is then kept as given for the user to check.
    """
    spec = BIOMARKERS[code]
    canonical = spec["unit"]
    norm = normalize_unit(unit)
    if not norm or norm == normalize_unit(canonical):
        return value, canonical, True
    factor = spec["convert"].get(norm)
    if factor is None:
        return value, unit or canonical, False
    return round(value * factor, 2), canonical, True


def is_plausible(code: str, value: float) -> bool:
    low, high = BIOMARKERS[code]["plausible"]
    return low <= value <= high


def reference(code: str, sex: Optional[str]) -> Dict[str, Optional[float]]:
    """The usual adult range for ``code`` (sex-specific when it differs)."""
    ref = BIOMARKERS[code]["ref"]
    female = (sex or "").lower() == "female"
    low = ref.get("low_female") if female and "low_female" in ref else ref.get("low")
    high = ref.get("high_female") if female and "high_female" in ref else ref.get("high")
    return {"low": low, "high": high}


def status(value: Optional[float], low: Optional[float], high: Optional[float]) -> str:
    """``low``, ``high``, ``in_range``, or ``unknown`` when there's no range to compare."""
    if value is None or (low is None and high is None):
        return "unknown"
    if low is not None and value < low:
        return "low"
    if high is not None and value > high:
        return "high"
    return "in_range"


def describe(code: str) -> dict:
    """Public facts about a biomarker for the app."""
    spec = BIOMARKERS[code]
    return {
        "code": code,
        "name": spec["name"],
        "unit": spec["unit"],
        "category": spec["category"],
        "about": spec["about"],
        "source": SOURCES[spec["source"]],
    }
