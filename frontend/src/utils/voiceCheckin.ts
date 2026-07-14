import { STRINGS } from '../constants/strings';

/**
 * The backend returns a free-form mood label (e.g. "positive", "tired",
 * "calm and focused"), so UI treatments bucket it into three sentiments.
 */
export type MoodSentiment = 'positive' | 'neutral' | 'low';

const POSITIVE_WORDS = [
  'positive', 'happy', 'good', 'great', 'energetic', 'energised', 'energized',
  'excited', 'motivated', 'strong', 'amazing', 'refreshed', 'upbeat', 'confident',
];
const LOW_WORDS = [
  'low', 'tired', 'sad', 'exhausted', 'stressed', 'bad', 'drained', 'anxious',
  'sore', 'down', 'negative', 'weak', 'sick', 'fatigued',
];

export function getMoodSentiment(mood: string): MoodSentiment {
  const normalized = mood.toLowerCase();
  if (POSITIVE_WORDS.some((word) => normalized.includes(word))) return 'positive';
  if (LOW_WORDS.some((word) => normalized.includes(word))) return 'low';
  return 'neutral';
}

export const MOOD_EMOJI: Record<MoodSentiment, string> = {
  positive: '😄',
  neutral: '😐',
  low: '😔',
};

export const MOOD_LABEL: Record<MoodSentiment, string> = {
  positive: STRINGS.voiceCheckin.moods.positive,
  neutral: STRINGS.voiceCheckin.moods.neutral,
  low: STRINGS.voiceCheckin.moods.low,
};

/**
 * Chart dot colors per sentiment (status encoding; identity is also carried
 * by the tooltip's mood text, never color alone). All ≥3:1 on the light surface.
 */
export const MOOD_CHART_COLOR: Record<MoodSentiment, string> = {
  positive: '#16a34a',
  neutral: '#64748b',
  low: '#ef4444',
};

/** MUI palette token per sentiment, for non-chart UI accents. */
export const MOOD_COLOR_TOKEN: Record<MoodSentiment, string> = {
  positive: 'success.main',
  neutral: 'text.secondary',
  low: 'error.main',
};

/**
 * Random speaking prompt for the recorder. `exclude` avoids showing the same
 * template twice in a row when re-rolling after a check-in.
 */
export function getRandomPrompt(exclude?: string): string {
  const prompts = STRINGS.voiceCheckin.recorder.promptTexts;
  const pool = prompts.filter((prompt) => prompt !== exclude);
  const source = pool.length > 0 ? pool : prompts;
  return source[Math.floor(Math.random() * source.length)];
}
