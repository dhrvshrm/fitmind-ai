/** `GET /tips/today`: one tip or "did you know" fact, the same for everyone each day. */
export type DailyTip = {
  date: string;
  kind: 'tip' | 'fact';
  text: string;
  topic: string;
  source: 'ai' | 'curated';
};
