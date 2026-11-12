"""A tiny document store used by the health models.

Every document has an ``id`` and a ``user_id``. With MongoDB connected the
documents live in ``name``; otherwise they live in an in-memory dict (local
development and tests), following the pattern in app/models/diet_plan.py.
"""
from typing import Any, Dict, List, Optional, Tuple

from app.config.database import get_database


def _matches(doc: dict, query: Dict[str, Any]) -> bool:
    for key, expected in query.items():
        if isinstance(expected, dict) and "$in" in expected:
            if doc.get(key) not in expected["$in"]:
                return False
        elif doc.get(key) != expected:
            return False
    return True


class Store:
    """One collection with an in-memory fallback."""

    def __init__(self, name: str):
        self.name = name
        self.memory: Dict[str, dict] = {}

    async def insert(self, doc: dict) -> dict:
        db = get_database()
        if db is not None:
            await db[self.name].insert_one(dict(doc))
        else:
            self.memory[doc["id"]] = dict(doc)
        return doc

    async def find_one(self, query: Dict[str, Any]) -> Optional[dict]:
        db = get_database()
        if db is not None:
            return await db[self.name].find_one(query, {"_id": 0})
        found = next((d for d in self.memory.values() if _matches(d, query)), None)
        return dict(found) if found else None

    async def find(
        self, query: Dict[str, Any], sort: Optional[Tuple[str, int]] = None, limit: int = 0
    ) -> List[dict]:
        db = get_database()
        if db is not None:
            cursor = db[self.name].find(query, {"_id": 0})
            if sort:
                cursor = cursor.sort(*sort)
            if limit:
                cursor = cursor.limit(limit)
            return [doc async for doc in cursor]
        docs = [dict(d) for d in self.memory.values() if _matches(d, query)]
        if sort:
            docs.sort(key=lambda d: (d.get(sort[0]) is None, d.get(sort[0])), reverse=sort[1] < 0)
        return docs[:limit] if limit else docs

    async def update(self, query: Dict[str, Any], fields: Dict[str, Any]) -> bool:
        db = get_database()
        if db is not None:
            result = await db[self.name].update_one(query, {"$set": fields})
            return result.matched_count > 0
        doc = next((d for d in self.memory.values() if _matches(d, query)), None)
        if doc is None:
            return False
        doc.update(fields)
        return True

    async def delete(self, query: Dict[str, Any]) -> int:
        db = get_database()
        if db is not None:
            result = await db[self.name].delete_many(query)
            return result.deleted_count
        keys = [k for k, d in self.memory.items() if _matches(d, query)]
        for key in keys:
            del self.memory[key]
        return len(keys)
