"""Read biomarker values out of a lab report. Everything returned is a DRAFT.

1. Local first: text PDFs are read with pypdf on the server (nothing leaves
   it), then each line is matched against known biomarker names and the
   number and unit that follow are taken.
2. AI second, only when the user allowed it: Gemini (app/ai/client.py) reads
   what local matching missed, the PDF's text, or the image of a scanned
   PDF or photo. Its answers are mapped to the same canonical biomarkers.

Nothing here is saved to the user's history: the user reviews every value
on the verification screen and only what they confirm is stored.
"""
import io
import logging
import re
from datetime import date
from typing import Dict, List, Optional

from pydantic import BaseModel, Field

from app.ai import client as ai_client
from app.ai.client import AIError
from app.health import biomarkers as bm

logger = logging.getLogger(__name__)

MAX_AI_TEXT_CHARS = 12000
# Fewer local matches than this in a text PDF means AI may find more.
LOCAL_ENOUGH = 3

_NUMBER = re.compile(r"(?<![\w.])(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)")
_UNIT = re.compile(r"^\s*([a-zA-Zµμ%][a-zA-Zµμ%/.\d]*(?:/[a-zA-Z.\d]+)?)")
_PAREN = re.compile(r"\(([^)]*)\)")
_LEADING_JUNK = re.compile(r"^[\s:=\-–,]*")
_RANGE = re.compile(r"(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)")

_MONTHS = {m: i for i, m in enumerate(
    ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"], start=1)}
_DATE_PATTERNS = [
    (re.compile(r"\b(\d{4})-(\d{1,2})-(\d{1,2})\b"), ("y", "m", "d")),
    (re.compile(r"\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})\b"), ("d", "m", "y")),  # India: day first
    (re.compile(r"\b(\d{1,2})[\s-]+([A-Za-z]{3})[a-z]*[\s,-]+(\d{4})\b"), ("d", "mon", "y")),
]
_DATE_HINT = re.compile(r"collect|sample|report(?:ed)?\s*(?:date|on)|date", re.I)


class AIExtractedValue(BaseModel):
    name: str = Field(max_length=120)
    value: float
    unit: Optional[str] = Field(default=None, max_length=40)
    ref_low: Optional[float] = None
    ref_high: Optional[float] = None


class AIExtraction(BaseModel):
    report_date: Optional[str] = Field(default=None, description="YYYY-MM-DD if printed on the report")
    lab: Optional[str] = Field(default=None, max_length=120)
    values: List[AIExtractedValue] = Field(default_factory=list, max_length=80)


_AI_SYSTEM = (
    "You read medical lab reports and copy out test results exactly as printed. "
    "Never interpret, diagnose or add values that are not on the report."
)
_AI_PROMPT = (
    "Extract every lab test result from this report: the test name as printed, the numeric "
    "result, its unit, and the reference range low/high if printed. Also the sample or report "
    "date (YYYY-MM-DD) and the lab name if shown. Skip anything without a numeric result."
)


# ---------------------------------------------------------------------------
# Local extraction
# ---------------------------------------------------------------------------
def pdf_text(content: bytes) -> str:
    """Text of a PDF (empty for scanned PDFs or unreadable files)."""
    try:
        from pypdf import PdfReader

        reader = PdfReader(io.BytesIO(content))
        return "\n".join((page.extract_text() or "") for page in reader.pages[:20])
    except Exception as e:  # A broken PDF just means nothing found locally.
        logger.info("Could not read PDF text: %s", e)
        return ""


def _parse_date(text: str) -> Optional[str]:
    for pattern, order in _DATE_PATTERNS:
        for match in pattern.finditer(text):
            parts = dict(zip(order, match.groups()))
            try:
                month = _MONTHS[parts["mon"][:3].lower()] if "mon" in parts else int(parts["m"])
                found = date(int(parts["y"]), month, int(parts["d"]))
            except (KeyError, ValueError):
                continue
            if 2000 <= found.year <= 2100:
                return found.isoformat()
    return None


def find_report_date(text: str) -> Optional[str]:
    """The sample/report date: from a line that says so, else the first date."""
    for line in text.splitlines():
        if _DATE_HINT.search(line):
            found = _parse_date(line)
            if found:
                return found
    return _parse_date(text)


def _known_unit(code: str, token: str) -> bool:
    norm = bm.normalize_unit(token)
    spec = bm.BIOMARKERS[code]
    return bool(norm) and (norm == bm.normalize_unit(spec["unit"]) or norm in spec["convert"])


def _value_from_line(code: str, rest: str) -> Optional[dict]:
    """Number and unit that follow a biomarker name on one line."""
    unit_hint = None
    for group in _PAREN.findall(rest):
        if _known_unit(code, group):
            unit_hint = group.strip()
    rest = _LEADING_JUNK.sub("", _PAREN.sub(" ", rest))
    match = _NUMBER.search(rest)
    if not match:
        return None
    value = float(match.group(1).replace(",", ""))
    unit_match = _UNIT.match(rest[match.end():])
    unit = unit_match.group(1) if unit_match and _known_unit(code, unit_match.group(1)) else unit_hint
    # A printed reference range ("4.0 - 5.6") after the value, when there is one.
    ref = _RANGE.search(rest[match.end():])
    ref_low, ref_high = (float(ref.group(1)), float(ref.group(2))) if ref else (None, None)
    if ref_low is not None and ref_low >= ref_high:
        ref_low = ref_high = None
    return {"value": value, "unit": unit, "ref_low": ref_low, "ref_high": ref_high}


def _draft(code: str, value: float, unit: Optional[str], source: str,
           ref_low: Optional[float] = None, ref_high: Optional[float] = None,
           name: Optional[str] = None) -> Optional[dict]:
    converted, canonical, ok = bm.to_canonical(code, value, unit)
    if ok and not bm.is_plausible(code, converted):
        return None
    if ok and unit and bm.normalize_unit(unit) != bm.normalize_unit(canonical):
        # A lab range printed in the other unit is converted the same way.
        factor = bm.BIOMARKERS[code]["convert"][bm.normalize_unit(unit)]
        ref_low = round(ref_low * factor, 2) if ref_low is not None else None
        ref_high = round(ref_high * factor, 2) if ref_high is not None else None
    return {
        "code": code,
        "name": name or bm.BIOMARKERS[code]["name"],
        "value": converted,
        "unit": canonical,
        "ref_low": ref_low,
        "ref_high": ref_high,
        "source": source,
        "unit_checked": ok,
    }


def extract_local(text: str) -> List[dict]:
    """Biomarker drafts found by name matching, one per biomarker (first wins)."""
    drafts: Dict[str, dict] = {}
    for line in text.splitlines():
        found = bm.find_code(line)
        if not found:
            continue
        code, end = found
        if code in drafts:
            continue
        parsed = _value_from_line(code, line[end:])
        if not parsed:
            continue
        draft = _draft(code, parsed["value"], parsed["unit"], "local", parsed["ref_low"], parsed["ref_high"])
        if draft:
            drafts[code] = draft
    return list(drafts.values())


# ---------------------------------------------------------------------------
# AI extraction
# ---------------------------------------------------------------------------
def _slug(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", name.lower()).strip("_")[:40] or "value"


def _from_ai(result: AIExtraction) -> List[dict]:
    drafts: Dict[str, dict] = {}
    for item in result.values:
        code = bm.code_for_name(item.name)
        if code:
            draft = _draft(code, item.value, item.unit, "ai", item.ref_low, item.ref_high)
        else:
            # Not a biomarker we know: keep it as printed so the user can decide.
            code = f"other_{_slug(item.name)}"
            draft = {
                "code": code, "name": item.name.strip(), "value": item.value, "unit": item.unit or "",
                "ref_low": item.ref_low, "ref_high": item.ref_high, "source": "ai", "unit_checked": False,
            }
        if draft and code not in drafts:
            drafts[code] = draft
    return list(drafts.values())


async def extract_with_ai(user_id: str, text: Optional[str], content: bytes, mime_type: str) -> dict:
    """Ask the AI to read the report (its text when there is some, else the file).

    Raises:
        AIError: when the AI is unavailable or the quota is used up.
    """
    if text and text.strip():
        prompt = f"{_AI_PROMPT}\n\nReport text:\n{text[:MAX_AI_TEXT_CHARS]}"
        result = await ai_client.generate_json(
            prompt, AIExtraction, system=_AI_SYSTEM, temperature=0.0, user_id=user_id
        )
    else:
        result = await ai_client.generate_json_from_image(
            _AI_PROMPT, content, mime_type, AIExtraction, system=_AI_SYSTEM, user_id=user_id
        )
    return {
        "drafts": _from_ai(result),
        "report_date": _parse_date(result.report_date or "") if result.report_date else None,
        "lab": result.lab,
    }


async def extract(user_id: str, content: bytes, mime_type: str, allow_ai: bool) -> dict:
    """Draft values for a report: local first, AI for what's missing (if allowed).

    Returns ``{"drafts", "report_date", "lab", "methods", "ai_error"}``.
    """
    text = pdf_text(content) if mime_type == "application/pdf" else ""
    drafts = extract_local(text) if text else []
    report_date = find_report_date(text) if text else None
    methods = ["local"] if text else []
    lab = None
    ai_error = None
    if allow_ai and len(drafts) < LOCAL_ENOUGH:
        try:
            ai = await extract_with_ai(user_id, text, content, mime_type)
            have = {d["code"] for d in drafts}
            drafts += [d for d in ai["drafts"] if d["code"] not in have]
            report_date = report_date or ai["report_date"]
            lab = ai["lab"]
            methods.append("ai")
        except AIError as e:
            logger.info("AI report extraction unavailable for %s: %s", user_id, e)
            ai_error = "unavailable"
    return {"drafts": drafts, "report_date": report_date, "lab": lab, "methods": methods, "ai_error": ai_error}
