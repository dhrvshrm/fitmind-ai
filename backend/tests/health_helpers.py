"""Helpers shared by the health tests (consent, sample PDFs, encryption key)."""
from cryptography.fernet import Fernet

from app.config.settings import get_settings

API = "/api/v1"


def grant(client, headers, scope):
    res = client.post(f"{API}/consents", headers=headers, json={"scope": scope})
    assert res.status_code == 200, res.text
    return res.json()["data"]


def use_encryption_key(monkeypatch):
    """Turn on health data encryption with a fresh key for this test."""
    key = Fernet.generate_key().decode()
    monkeypatch.setattr(get_settings(), "HEALTH_DATA_KEY", key)
    return key


def _escape(text):
    return text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def make_pdf(lines):
    """A minimal one-page text PDF with one line per entry."""
    body = " ".join(f"({_escape(line)}) Tj T*" for line in lines)
    content = f"BT /F1 11 Tf 50 750 Td 14 TL {body} ET"
    objects = [
        "<< /Type /Catalog /Pages 2 0 R >>",
        "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R "
        "/Resources << /Font << /F1 5 0 R >> >> >>",
        f"<< /Length {len(content)} >>\nstream\n{content}\nendstream",
        "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ]
    out = b"%PDF-1.4\n"
    offsets = []
    for number, obj in enumerate(objects, start=1):
        offsets.append(len(out))
        out += f"{number} 0 obj\n{obj}\nendobj\n".encode("latin-1")
    xref = len(out)
    out += f"xref\n0 {len(objects) + 1}\n0000000000 65535 f \n".encode()
    for offset in offsets:
        out += f"{offset:010d} 00000 n \n".encode()
    out += f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n".encode()
    return out


SAMPLE_REPORT_LINES = [
    "City Diagnostics Lab",
    "Sample Collected On: 03/10/2026",
    "Glycated Haemoglobin (HbA1c) : 6.8 % 4.0 - 5.6",
    "Fasting Blood Sugar (FBS) 112 mg/dL 70-99",
    "HDL Cholesterol 38 mg/dL",
    "LDL/HDL Ratio 3.6",
    "Vitamin B12 180 pg/mL 200-900",
    "Vitamin D (25-OH) 14.2 ng/mL",
]

# The smallest valid PNG header; enough for type detection.
PNG_BYTES = b"\x89PNG\r\n\x1a\n" + b"\x00" * 64
