"""Print the three habit numbers from the stored analytics events.

Usage (from backend/, with MONGODB_URL set as for the app):
    python scripts/metrics.py            # people who signed up in the last 30 days
    python scripts/metrics.py --days 14

- Day-1 activation: share of new users who logged a meal on the day they signed up.
- Day-7 retention: share who logged a meal on their seventh day (signup day is
  day 1), counting only people whose seventh day is over.
- Weekly active loggers: people who logged a meal or a workout in the last 7 days.

Dates are each user's own local dates. Only events recorded since analytics
was added count, so older accounts don't appear in the cohorts.
"""
import argparse
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.config import database  # noqa: E402
from app.services import analytics_service  # noqa: E402


def _pct(value) -> str:
    return "n/a" if value is None else f"{value * 100:.1f}%"


async def main(days: int) -> None:
    await database.connect_to_mongo()
    if database.get_database() is None:
        print("No database connection; nothing to report.")
        return
    m = await analytics_service.metrics(cohort_days=days)
    await database.close_mongo_connection()
    print(f"FitMind habit metrics as of {m['as_of']} (signups in the last {m['cohort_days']} days)")
    print(f"  New users:              {m['new_users']}")
    print(f"  Day-1 activation:       {_pct(m['day1_activation'])}"
          f"  ({m['day1_meal_loggers']} of {m['new_users']} logged a meal on day 1)")
    print(f"  Day-7 retention:        {_pct(m['day7_retention'])}"
          f"  ({m['day7_meal_loggers']} of {m['day7_eligible']} logged a meal on day 7)")
    print(f"  Weekly active loggers:  {m['weekly_active_loggers']}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--days", type=int, default=30, help="signup window in days (default 30)")
    asyncio.run(main(parser.parse_args().days))
