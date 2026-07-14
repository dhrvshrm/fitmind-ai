from typing import List, Optional

from pydantic import BaseModel


class VoiceCheckinRequest(BaseModel):
    """Optional metadata accompanying a voice check-in upload.

    The audio itself is sent as a multipart file, not in this body; this
    schema carries any optional text note the client wants to attach.
    """

    note: Optional[str] = None


class MoodAnalysisResponse(BaseModel):
    """Result of analysing a transcript for mood and energy."""

    mood: str
    energy_level: int


class VoiceCheckinResponse(BaseModel):
    """Response returned after processing a voice check-in."""

    transcript: str
    mood: str
    energy_level: int
    timestamp: str


class VoiceCheckinHistoryItem(BaseModel):
    """A single check-in in the history list."""

    date: str
    mood: str
    energy: int


class VoiceCheckinHistoryResponse(BaseModel):
    """Response for the voice check-in history endpoint."""

    checkins: List[VoiceCheckinHistoryItem]
