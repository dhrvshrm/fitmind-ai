"""Restore a backup made by ``scripts/backup_db.py``.

    python scripts/restore_db.py backups/fitmind-fitmind-20261112T020000Z.jsonl.gz --yes
    python scripts/restore_db.py FILE --drop --yes          # replace collections entirely
    python scripts/restore_db.py FILE --only meals users --yes
    python scripts/restore_db.py FILE --dry-run             # just count what's in the file

Writes to the database in MONGODB_URL / DATABASE_NAME (.env.local), or
``--db`` if given. Without ``--drop``, documents are upserted by ``_id`` so
newer documents not in the backup are kept. Indexes are recreated by the
app on its next start (``ensure_indexes``). Nothing is written without --yes.
"""
import argparse
import gzip
import json
import sys
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from bson import json_util  # noqa: E402
from pymongo import ReplaceOne  # noqa: E402

from app.config.settings import get_settings  # noqa: E402
from scripts.backup_db import FORMAT_VERSION, connect  # noqa: E402

BATCH = 500


def read_backup(path: Path):
    """Yield (meta, None) once, then (collection, document) pairs."""
    with gzip.open(path, "rt", encoding="utf-8") as handle:
        first = json.loads(handle.readline())
        meta = first.get("meta")
        if not meta or meta.get("format") != FORMAT_VERSION:
            raise SystemExit(f"{path} isn't a FitMind backup (format {FORMAT_VERSION})")
        yield meta, None
        for line in handle:
            if line.strip():
                record = json_util.loads(line)
                yield record["c"], record["d"]


def restore(path: Path, db_name: str, url: str, only: set, drop: bool, dry_run: bool) -> Counter:
    records = read_backup(path)
    meta, _ = next(records)
    print(f"Backup of '{meta['database']}' taken {meta['created_at']}")
    counts: Counter = Counter()
    client = None if dry_run else connect(url)
    db = client[db_name] if client else None
    dropped = set()
    batches: dict = {}

    def flush(name: str) -> None:
        if db is not None and batches.get(name):
            db[name].bulk_write(batches[name], ordered=False)
        batches[name] = []

    for name, doc in records:
        if only and name not in only:
            continue
        counts[name] += 1
        if dry_run:
            continue
        if drop and name not in dropped:
            db[name].drop()
            dropped.add(name)
        batches.setdefault(name, []).append(ReplaceOne({"_id": doc["_id"]}, doc, upsert=True))
        if len(batches[name]) >= BATCH:
            flush(name)
    for name in list(batches):
        flush(name)
    if client:
        client.close()
    for name, count in sorted(counts.items()):
        print(f"  {name}: {count}")
    action = "Would restore" if dry_run else "Restored"
    print(f"{action} {sum(counts.values())} documents into '{db_name}'")
    return counts


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("file", type=Path)
    parser.add_argument("--db", help="target database name (default: DATABASE_NAME)")
    parser.add_argument("--only", nargs="*", default=[], help="restore just these collections")
    parser.add_argument("--drop", action="store_true", help="drop each restored collection first")
    parser.add_argument("--dry-run", action="store_true", help="count documents without writing")
    parser.add_argument("--yes", action="store_true", help="confirm writing to the database")
    args = parser.parse_args()
    settings = get_settings()
    db_name = args.db or settings.DATABASE_NAME
    if not (args.yes or args.dry_run):
        raise SystemExit(f"This writes to database '{db_name}'. Re-run with --yes to confirm, or --dry-run.")
    restore(args.file, db_name, settings.MONGODB_URL, set(args.only), args.drop, args.dry_run)


if __name__ == "__main__":
    main()
