"""Print a new HEALTH_DATA_KEY for encrypting health data at rest.

Usage:
    python scripts/generate_health_key.py

Put the printed value in backend/.env.local (or your host's secrets) as
HEALTH_DATA_KEY=... Keep it safe: data encrypted with a key can't be read
without it, and changing it makes existing health data unreadable.
"""
from cryptography.fernet import Fernet

if __name__ == "__main__":
    print(Fernet.generate_key().decode())
