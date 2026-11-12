from typing import Dict, Optional, Union

from pydantic import BaseModel, Field


class ClientEvent(BaseModel):
    """An analytics event sent by the app. Only allowlisted names and properties are kept."""

    event: str = Field(..., min_length=1, max_length=40)
    properties: Optional[Dict[str, Union[str, int, bool]]] = None


class PushKeys(BaseModel):
    p256dh: str = Field(..., min_length=1, max_length=200)
    auth: str = Field(..., min_length=1, max_length=100)


class PushSubscriptionIn(BaseModel):
    """The browser's PushSubscription, as returned by ``subscription.toJSON()``."""

    endpoint: str = Field(..., min_length=10, max_length=1000)
    keys: PushKeys


class PushUnsubscribe(BaseModel):
    endpoint: str = Field(..., min_length=10, max_length=1000)


class ReminderSettingsUpdate(BaseModel):
    """Partial update; only provided fields change. Times are local ``HH:MM``."""

    enabled: Optional[bool] = None
    meals: Optional[bool] = None
    workout: Optional[bool] = None
    water: Optional[bool] = None
    comeback: Optional[bool] = None
    workout_time: Optional[str] = Field(None, max_length=5)
    water_time: Optional[str] = Field(None, max_length=5)
