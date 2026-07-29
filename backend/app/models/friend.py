import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional
from uuid import uuid4

from app.config.database import get_database

logger = logging.getLogger(__name__)

# Collection + in-memory fallback for friend relationships.
COLLECTION_NAME = "friendships"
_MEMORY_STORE: Dict[str, dict] = {}

STATUS_PENDING = "pending"
STATUS_ACCEPTED = "accepted"


class Friendship:
    """A directional friend request that becomes mutual once accepted.

    ``requester_id`` sent the request to ``addressee_id``. Only the addressee
    may accept it. An accepted friendship represents a mutual connection.
    """

    def __init__(
        self,
        requester_id: str,
        addressee_id: str,
        status: str = STATUS_PENDING,
        id: Optional[str] = None,
        created_at: Optional[datetime] = None,
        updated_at: Optional[datetime] = None,
    ) -> None:
        """Initialise a friendship, defaulting id/timestamps when omitted."""
        self.id: str = id or str(uuid4())
        self.requester_id: str = requester_id
        self.addressee_id: str = addressee_id
        self.status: str = status
        self.created_at: datetime = created_at or datetime.now(timezone.utc)
        self.updated_at: Optional[datetime] = updated_at

    def to_dict(self) -> dict:
        """Serialise the friendship for storage."""
        return {
            "id": self.id,
            "requester_id": self.requester_id,
            "addressee_id": self.addressee_id,
            "status": self.status,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }

    @classmethod
    def _from_dict(cls, data: dict) -> "Friendship":
        """Reconstruct a ``Friendship`` from a stored dict."""
        return cls(
            requester_id=data["requester_id"],
            addressee_id=data["addressee_id"],
            status=data.get("status", STATUS_PENDING),
            id=data.get("id"),
            created_at=data.get("created_at"),
            updated_at=data.get("updated_at"),
        )

    def other_user(self, user_id: str) -> str:
        """Return the id of the other party relative to ``user_id``."""
        return self.addressee_id if user_id == self.requester_id else self.requester_id

    async def save(self) -> "Friendship":
        """Insert or replace this friendship."""
        db = get_database()
        if db is not None:
            await db[COLLECTION_NAME].update_one(
                {"id": self.id}, {"$set": self.to_dict()}, upsert=True
            )
        else:
            _MEMORY_STORE[self.id] = self.to_dict()
        return self

    async def update_status(self, status: str) -> "Friendship":
        """Update the friendship status and persist."""
        self.status = status
        self.updated_at = datetime.now(timezone.utc)
        await self.save()
        return self

    @classmethod
    async def get_by_id(cls, friendship_id: str) -> Optional["Friendship"]:
        """Return a friendship by id, or ``None``."""
        db = get_database()
        if db is not None:
            data = await db[COLLECTION_NAME].find_one({"id": friendship_id})
            return cls._from_dict(data) if data else None
        data = _MEMORY_STORE.get(friendship_id)
        return cls._from_dict(data) if data else None

    @classmethod
    async def find_between(cls, user_a: str, user_b: str) -> Optional["Friendship"]:
        """Return any friendship linking two users, in either direction."""
        db = get_database()
        query = {
            "$or": [
                {"requester_id": user_a, "addressee_id": user_b},
                {"requester_id": user_b, "addressee_id": user_a},
            ]
        }
        if db is not None:
            data = await db[COLLECTION_NAME].find_one(query)
            return cls._from_dict(data) if data else None
        for data in _MEMORY_STORE.values():
            pair = {data["requester_id"], data["addressee_id"]}
            if pair == {user_a, user_b}:
                return cls._from_dict(data)
        return None

    @classmethod
    async def get_accepted_for(cls, user_id: str) -> List["Friendship"]:
        """Return all accepted friendships involving ``user_id``."""
        db = get_database()
        query = {
            "status": STATUS_ACCEPTED,
            "$or": [{"requester_id": user_id}, {"addressee_id": user_id}],
        }
        if db is not None:
            return [cls._from_dict(d) async for d in db[COLLECTION_NAME].find(query)]
        return [
            cls._from_dict(d)
            for d in _MEMORY_STORE.values()
            if d["status"] == STATUS_ACCEPTED
            and user_id in (d["requester_id"], d["addressee_id"])
        ]

    @classmethod
    async def get_pending_incoming(cls, user_id: str) -> List["Friendship"]:
        """Return pending requests addressed to ``user_id`` (incoming)."""
        db = get_database()
        query = {"status": STATUS_PENDING, "addressee_id": user_id}
        if db is not None:
            return [cls._from_dict(d) async for d in db[COLLECTION_NAME].find(query)]
        return [
            cls._from_dict(d)
            for d in _MEMORY_STORE.values()
            if d["status"] == STATUS_PENDING and d["addressee_id"] == user_id
        ]
