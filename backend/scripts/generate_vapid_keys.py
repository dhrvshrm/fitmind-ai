"""Generate a VAPID key pair for Web Push reminders.

Usage (from backend/):
    python scripts/generate_vapid_keys.py

Prints three lines to paste into .env.local (or your host's environment).
Keep the private key secret; never commit it. The public key is safe to share
(the browser needs it to subscribe). Changing keys later means every device
has to turn reminders on again.
"""
import base64

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec


def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def generate() -> tuple:
    """(public key, private key), both base64url without padding, as Web Push expects."""
    key = ec.generate_private_key(ec.SECP256R1())
    private_raw = key.private_numbers().private_value.to_bytes(32, "big")
    public_raw = key.public_key().public_bytes(
        serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint
    )
    return _b64url(public_raw), _b64url(private_raw)


if __name__ == "__main__":
    public, private = generate()
    print(f"VAPID_PUBLIC_KEY={public}")
    print(f"VAPID_PRIVATE_KEY={private}")
    print("VAPID_SUBJECT=mailto:you@example.com  # replace with your contact")
