# Operations

How to run and look after FitMind AI in production.

## Database backups

Two scripts in `backend/scripts` dump and restore every MongoDB collection. They read `MONGODB_URL` and `DATABASE_NAME` the same way the app does (from `backend/.env.local` or the environment).

### Taking a backup

```
cd backend
venv/Scripts/python scripts/backup_db.py --out-dir backups
```

This writes one file, `backups/fitmind-<database>-<UTC time>.jsonl.gz`: gzip-compressed JSON Lines, a header line with the database name, time and collection list, then one line per document in MongoDB Extended JSON (dates and ids survive a restore). The AI and barcode caches (`ai_cache`, `food_barcodes`) are skipped because they rebuild themselves; add `--include-caches` to keep them.

The file contains personal and health data. Keep it out of git (`backups/` and `*.jsonl.gz` are ignored), store it encrypted, and only where the people running the service can read it. Delete old copies on a schedule; a backup of a deleted account still holds that person's data until it expires.

Suggested routine on the free tier: a daily backup from a scheduled job (for example a GitHub Actions cron with `MONGODB_URL` as a secret, uploading the file to private storage), keeping 7 daily and 4 weekly copies. MongoDB Atlas M0 has no built-in backups, so this script is the backup.

### Restoring

```
venv/Scripts/python scripts/restore_db.py backups/FILE.jsonl.gz --dry-run   # count what is inside
venv/Scripts/python scripts/restore_db.py backups/FILE.jsonl.gz --yes       # upsert by _id
venv/Scripts/python scripts/restore_db.py backups/FILE.jsonl.gz --drop --yes          # replace collections
venv/Scripts/python scripts/restore_db.py backups/FILE.jsonl.gz --only meals --yes    # one collection
venv/Scripts/python scripts/restore_db.py backups/FILE.jsonl.gz --db fitmind_restore --yes  # into another database
```

Nothing is written without `--yes`. Without `--drop`, documents are upserted by `_id`, so newer documents that aren't in the backup are kept. Indexes are recreated by the app on its next start. Restoring into a separate database first (`--db`) and checking it is the safest way to recover a few records.

If an account was deleted after the backup was taken, delete it again after restoring (the account deletion endpoint, or the same collections listed in `privacy_service.USER_DATA_COLLECTIONS`), so a restore never brings back data someone asked to remove.
