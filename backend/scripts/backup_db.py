"""Dump every MongoDB collection to one timestamped, gzip-compressed JSON Lines file.

    python scripts/backup_db.py [--out-dir backups] [--exclude ai_cache food_barcodes]

Reads MONGODB_URL and DATABASE_NAME the same way the app does (.env.local).
The file is ``<out-dir>/fitmind-<db>-<UTC timestamp>.jsonl.gz``:

- line 1: ``{"meta": {...}}`` with the database name, time and per-collection counts,
- then one line per document: ``{"c": "<collection>", "d": <document>}``.

Documents are MongoDB Extended JSON (bson.json_util, relaxed mode), so dates
and ObjectIds survive a restore. Caches (``ai_cache``, ``food_barcodes``) are
skipped by default because they rebuild themselves. Restore with
``scripts/restore_db.py``. The file holds personal and health data: store it
encrypted and somewhere only the operators can read.
"""
import argparse
import gzip
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from bson import json_util  # noqa: E402
from pymongo import MongoClient  # noqa: E402

from app.config.settings import get_settings  # noqa: E402

DEFAULT_EXCLUDE = ("ai_cache", "food_barcodes")
FORMAT_VERSION = 1


def connect(url: str) -> MongoClient:
    """A client with the same TLS handling as the app (Atlas needs the CA bundle)."""
    options: dict = {"serverSelectionTimeoutMS": 10000, "tz_aware": True}
    if url.startswith("mongodb+srv://") or "tls=true" in url.lower():
        import certifi

        options["tlsCAFile"] = certifi.where()
    return MongoClient(url, **options)


def backup(url: str, db_name: str, out_dir: Path, exclude: set) -> Path:
    client = connect(url)
    client.admin.command("ping")
    db = client[db_name]
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    out_dir.mkdir(parents=True, exist_ok=True)
    path = out_dir / f"fitmind-{db_name}-{stamp}.jsonl.gz"
    collections = sorted(n for n in db.list_collection_names() if n not in exclude and not n.startswith("system."))
    counts = {}
    options = json_util.JSONOptions(json_mode=json_util.JSONMode.RELAXED, tz_aware=True)
    tmp = path.with_suffix(".tmp")
    with gzip.open(tmp, "wt", encoding="utf-8") as handle:
        meta = {
            "format": FORMAT_VERSION,
            "database": db_name,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "collections": collections,
        }
        handle.write(json.dumps({"meta": meta}) + "\n")
        for name in collections:
            count = 0
            for doc in db[name].find({}):
                handle.write('{"c": ' + json.dumps(name) + ', "d": ' + json_util.dumps(doc, json_options=options) + "}\n")
                count += 1
            counts[name] = count
            print(f"  {name}: {count}")
    tmp.replace(path)
    client.close()
    print(f"Backed up {sum(counts.values())} documents from {len(counts)} collections to {path}")
    return path


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--out-dir", default="backups", help="folder for the backup file (default: backups)")
    parser.add_argument("--exclude", nargs="*", default=list(DEFAULT_EXCLUDE), help="collections to skip")
    parser.add_argument("--include-caches", action="store_true", help="also back up ai_cache and food_barcodes")
    args = parser.parse_args()
    settings = get_settings()
    exclude = set() if args.include_caches else set(args.exclude)
    backup(settings.MONGODB_URL, settings.DATABASE_NAME, Path(args.out_dir), exclude)


if __name__ == "__main__":
    main()
