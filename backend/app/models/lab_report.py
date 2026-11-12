"""Uploaded lab reports, their files, and confirmed biomarker values.

- ``health_reports``: one per upload. Extracted drafts and file details are
  encrypted; status is ``needs_review`` until the user confirms the values.
- ``health_report_files``: the file itself when R2 isn't configured
  (development fallback), Fernet-encrypted.
- ``biomarkers``: values the user confirmed (or entered by hand). The value,
  unit and reference range are encrypted; ``code`` and ``measured_at`` stay
  readable so history can be listed per biomarker.
"""
from datetime import datetime, timezone
from typing import List, Optional

from bson.binary import Binary

from app.health import crypto
from app.health.store import Store

REPORTS = Store("health_reports")
FILES = Store("health_report_files")
BIOMARKERS = Store("biomarkers")
_REPORT_MEMORY = REPORTS.memory
_FILE_MEMORY = FILES.memory
_BIOMARKER_MEMORY = BIOMARKERS.memory

STATUS_NEEDS_REVIEW = "needs_review"
STATUS_CONFIRMED = "confirmed"


def _merge(doc: dict) -> dict:
    """A stored document with its encrypted ``data`` decrypted and flattened in."""
    private = crypto.decrypt(doc.get("data")) or {}
    public = {k: v for k, v in doc.items() if k != "data"}
    return {**public, **private}


# Reports ---------------------------------------------------------------------
async def create_report(public: dict, private: dict) -> dict:
    stored = {**public, "data": crypto.encrypt(private)}
    await REPORTS.insert(stored)
    return {**public, **private}


async def get_report(user_id: str, report_id: str) -> Optional[dict]:
    doc = await REPORTS.find_one({"id": report_id, "user_id": user_id})
    return _merge(doc) if doc else None


async def get_report_raw(user_id: str, report_id: str) -> Optional[dict]:
    """The stored document as-is (used by tests to check encryption)."""
    return await REPORTS.find_one({"id": report_id, "user_id": user_id})


async def list_reports(user_id: str) -> List[dict]:
    docs = await REPORTS.find({"user_id": user_id}, sort=("created_at", -1))
    return [_merge(d) for d in docs]


async def update_report(user_id: str, report_id: str, public: dict, private: dict) -> None:
    await REPORTS.update(
        {"id": report_id, "user_id": user_id}, {**public, "data": crypto.encrypt(private)}
    )


async def delete_report(user_id: str, report_id: str) -> int:
    return await REPORTS.delete({"id": report_id, "user_id": user_id})


# Files (development fallback when R2 isn't configured) ------------------------
async def save_file(user_id: str, report_id: str, content: bytes) -> None:
    await FILES.insert({
        "id": report_id,
        "user_id": user_id,
        "report_id": report_id,
        "content": Binary(crypto.encrypt_bytes(content)),
        "encrypted": crypto.is_enabled(),
        "created_at": datetime.now(timezone.utc),
    })


async def get_file(user_id: str, report_id: str) -> Optional[bytes]:
    doc = await FILES.find_one({"report_id": report_id, "user_id": user_id})
    if doc is None:
        return None
    return crypto.decrypt_bytes(bytes(doc["content"]), bool(doc.get("encrypted")))


async def delete_file(user_id: str, report_id: str) -> int:
    return await FILES.delete({"report_id": report_id, "user_id": user_id})


# Biomarkers ------------------------------------------------------------------
PRIVATE_BIOMARKER_FIELDS = ("name", "value", "unit", "ref_low", "ref_high", "ref_source")


async def add_biomarker(doc: dict) -> dict:
    private = {k: doc.get(k) for k in PRIVATE_BIOMARKER_FIELDS}
    public = {k: v for k, v in doc.items() if k not in PRIVATE_BIOMARKER_FIELDS}
    await BIOMARKERS.insert({**public, "data": crypto.encrypt(private)})
    return {**public, **private}


async def list_biomarkers(user_id: str) -> List[dict]:
    docs = await BIOMARKERS.find({"user_id": user_id}, sort=("measured_at", 1))
    return [_merge(d) for d in docs]


async def list_biomarkers_raw(user_id: str) -> List[dict]:
    """Stored documents as-is (used by tests to check encryption)."""
    return await BIOMARKERS.find({"user_id": user_id})


async def delete_biomarker(user_id: str, biomarker_id: str) -> int:
    return await BIOMARKERS.delete({"id": biomarker_id, "user_id": user_id})


async def delete_biomarkers_for_report(user_id: str, report_id: str) -> int:
    return await BIOMARKERS.delete({"user_id": user_id, "report_id": report_id})


async def delete_all(user_id: str) -> int:
    """Remove every report, file and biomarker for the user. Returns the count."""
    total = 0
    for store in (REPORTS, FILES, BIOMARKERS):
        total += await store.delete({"user_id": user_id})
    return total
