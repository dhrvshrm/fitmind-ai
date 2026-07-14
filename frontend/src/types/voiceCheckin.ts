/** Voice check-in types, aligned with the backend voice_checkin schemas. */

/** `POST /checkin/voice` -> data. `mood` is a free-form label from the AI. */
export type VoiceCheckinResult = {
  transcript: string;
  mood: string;
  energy_level: number;
  timestamp: string;
};

/** One item in `GET /checkin/history` -> data.checkins. Energy is 1–10. */
export type VoiceHistoryItem = {
  date: string;
  mood: string;
  energy: number;
};

/** Recorder lifecycle used by `useVoiceRecording`. */
export type RecordingStatus = 'idle' | 'requesting' | 'recording';
