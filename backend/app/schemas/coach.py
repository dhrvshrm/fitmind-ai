from pydantic import BaseModel, Field


class CoachMessageRequest(BaseModel):
    """A chat message sent over HTTP (the WebSocket is the streaming path)."""

    content: str = Field(..., min_length=1, max_length=6000)
