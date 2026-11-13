import { apiClient } from '../lib/apiClient';
import { WORKOUT_ENDPOINTS } from '../constants/api';
import type { ApiEnvelope } from '../types/auth';
import type { ExerciseSummary } from '../types/exercise';
import type {
  ExerciseCompleteResult,
  GeneratePlanPayload,
  ProgressionSuggestions,
  QuickSessionPayload,
  StrengthSummary,
  TodayWorkout,
  WeeklyPlan,
  WorkoutHistoryItem,
  WorkoutLogPayload,
  WorkoutLogResult,
} from '../types/workout';

/** Workout API. Unwraps the backend `{ success, message, data }` envelope. */
export const workoutService = {
  /** Builds (and saves) a fresh weekly plan from the exercise catalogue. */
  async generateWorkoutPlan(payload: GeneratePlanPayload = {}): Promise<WeeklyPlan> {
    const { data } = await apiClient.post<ApiEnvelope<{ weekly_plan: WeeklyPlan }>>(
      WORKOUT_ENDPOINTS.GENERATE,
      payload,
    );
    return data.data.weekly_plan;
  },

  /** Returns the current weekly plan, or null when none has been generated. */
  async getWeeklyPlan(): Promise<WeeklyPlan | null> {
    const { data } = await apiClient.get<ApiEnvelope<{ plan: WeeklyPlan | null }>>(
      WORKOUT_ENDPOINTS.WEEKLY_PLAN,
    );
    return data.data.plan;
  },

  /** Today's session, adjusted for today's recovery, or a chosen quick session. */
  async getTodayWorkout(): Promise<TodayWorkout> {
    const { data } = await apiClient.get<ApiEnvelope<TodayWorkout>>(WORKOUT_ENDPOINTS.TODAY);
    return data.data;
  },

  /** Replaces today's session with a 10, 15 or 20 minute circuit. */
  async startQuickSession(payload: QuickSessionPayload): Promise<TodayWorkout> {
    const { data } = await apiClient.post<ApiEnvelope<TodayWorkout>>(WORKOUT_ENDPOINTS.QUICK, payload);
    return data.data;
  },

  /** Goes back to today's planned session. */
  async endQuickSession(): Promise<TodayWorkout> {
    const { data } = await apiClient.delete<ApiEnvelope<TodayWorkout>>(WORKOUT_ENDPOINTS.QUICK);
    return data.data;
  },

  /** Exercises with the same movement that suit the user's equipment, injuries and level. */
  async getSwapOptions(day: string, index: number): Promise<ExerciseSummary[]> {
    const { data } = await apiClient.get<ApiEnvelope<ExerciseSummary[]>>(
      WORKOUT_ENDPOINTS.alternatives(day, index),
    );
    return data.data;
  },

  async swapExercise(day: string, index: number, exerciseId: string): Promise<WeeklyPlan> {
    const { data } = await apiClient.post<ApiEnvelope<{ plan: WeeklyPlan }>>(
      WORKOUT_ENDPOINTS.swap(day, index),
      { exercise_id: exerciseId },
    );
    return data.data.plan;
  },

  /** Logs a completed workout; awards XP, recomputes level, checks badges. */
  async logWorkout(payload: WorkoutLogPayload): Promise<WorkoutLogResult> {
    const { data } = await apiClient.post<ApiEnvelope<WorkoutLogResult>>(
      WORKOUT_ENDPOINTS.LOG,
      payload,
    );
    return data.data;
  },

  /** History comes back newest-first from the API. */
  async getWorkoutHistory(days = 30): Promise<WorkoutHistoryItem[]> {
    const { data } = await apiClient.get<ApiEnvelope<{ workouts: WorkoutHistoryItem[] }>>(
      WORKOUT_ENDPOINTS.HISTORY,
      { params: { days } },
    );
    return data.data.workouts;
  },

  /** Marks a single exercise complete for today (real-time tracking). */
  async completeExercise(exerciseName: string): Promise<ExerciseCompleteResult> {
    const { data } = await apiClient.put<ApiEnvelope<ExerciseCompleteResult>>(
      WORKOUT_ENDPOINTS.EXERCISE_COMPLETE,
      { exercise_name: exerciseName },
    );
    return data.data;
  },

  /** Easy-week and level suggestions from logged training. */
  async getProgression(): Promise<ProgressionSuggestions> {
    const { data } = await apiClient.get<ApiEnvelope<ProgressionSuggestions>>(WORKOUT_ENDPOINTS.PROGRESSION);
    return data.data;
  },

  async startDeload(): Promise<{ deload_until: string }> {
    const { data } = await apiClient.post<ApiEnvelope<{ deload_until: string }>>(WORKOUT_ENDPOINTS.DELOAD);
    return data.data;
  },

  async endDeload(): Promise<void> {
    await apiClient.delete(WORKOUT_ENDPOINTS.DELOAD);
  },

  /** Hides a suggestion for two weeks. */
  async snoozeSuggestion(kind: 'deload' | 'level'): Promise<void> {
    await apiClient.post(WORKOUT_ENDPOINTS.snooze(kind));
  },

  /** Moves to the next level and rebuilds the weekly plan. */
  async levelUp(): Promise<{ level: string }> {
    const { data } = await apiClient.post<ApiEnvelope<{ level: string }>>(WORKOUT_ENDPOINTS.LEVEL_UP);
    return data.data;
  },

  async getStrength(): Promise<StrengthSummary> {
    const { data } = await apiClient.get<ApiEnvelope<StrengthSummary>>(WORKOUT_ENDPOINTS.STRENGTH);
    return data.data;
  },
};
