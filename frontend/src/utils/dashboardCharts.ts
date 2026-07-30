import type {
  MoodPerformancePoint,
  MoodWorkoutPoint,
  WeightTrendPoint,
  WorkoutRatePoint,
} from "../types/dashboard";

/**
 * Joins the mood-performance series with the workout-rate series by date, so
 * each day with a voice check-in also carries that day's workout count.
 * Both endpoints already cover the same 30-day window.
 */
export function joinMoodAndWorkouts(
  mood: MoodPerformancePoint[],
  workouts: WorkoutRatePoint[],
): MoodWorkoutPoint[] {
  const workoutsByDate = new Map(workouts.map((w) => [w.date, w.workouts]));
  return mood.map((m) => ({
    date: m.date,
    energy: m.energy,
    mood: m.mood,
    workouts: workoutsByDate.get(m.date) ?? 0,
  }));
}

/**
 * Least-squares linear fit over `weight`, indexed by position (not calendar
 * time, so gaps between entries don't skew the slope). Returns `null` when
 * there isn't enough data for a fit to mean anything, or the entries don't
 * vary in position (a single repeated date).
 */
export function computeWeightTrendLine(
  points: WeightTrendPoint[],
): Array<{ date: string; trend: number }> | null {
  const n = points.length;
  if (n < 3) return null;

  const xMean = (n - 1) / 2;
  const yMean = points.reduce((sum, p) => sum + p.weight, 0) / n;

  let numerator = 0;
  let denominator = 0;
  points.forEach((p, i) => {
    numerator += (i - xMean) * (p.weight - yMean);
    denominator += (i - xMean) ** 2;
  });
  if (denominator === 0) return null;

  const slope = numerator / denominator;
  const intercept = yMean - slope * xMean;
  return points.map((p, i) => ({
    date: p.date,
    trend: Math.round((slope * i + intercept) * 10) / 10,
  }));
}

export type WeeklyWorkoutBucket = {
  label: string;
  workouts: number;
};

/**
 * Groups the 30 daily (zero-filled, oldest-first) workout-rate points into
 * ~7-day buckets, most-recent week last, so the bar chart reads oldest to
 * newest left-to-right like every other chart in the app. The oldest bucket
 * may be shorter than 7 days if the window doesn't divide evenly.
 */
export function bucketWorkoutsByWeek(
  points: WorkoutRatePoint[],
): WeeklyWorkoutBucket[] {
  const chunks: WorkoutRatePoint[][] = [];
  let end = points.length;
  while (end > 0) {
    const start = Math.max(0, end - 7);
    chunks.push(points.slice(start, end));
    end = start;
  }
  // `chunks[0]` is the most recent week; label and reverse to chronological order.
  return chunks
    .map((chunk, index) => ({
      label: index === 0 ? "This week" : `${index} wk ago`,
      workouts: chunk.reduce((sum, p) => sum + p.workouts, 0),
    }))
    .reverse();
}
