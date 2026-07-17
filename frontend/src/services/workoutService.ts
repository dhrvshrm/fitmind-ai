import { apiClient } from '../lib/apiClient';
import { WORKOUT_ENDPOINTS } from '../constants/api';
import type { ApiEnvelope } from '../types/auth';
import type {
  Exercise,
  GeneratePlanPayload,
  WeeklyPlan,
  WorkoutLogPayload,
  WorkoutLogResult,
} from '../types/workout';

/** Workout API. Unwraps the backend `{ success, message, data }` envelope. */
export const workoutService = {
  /** Generates (and persists) a fresh weekly plan; can take several seconds. */
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

  async getTodayWorkout(): Promise<Exercise[]> {
    const { data } = await apiClient.get<ApiEnvelope<{ exercises: Exercise[] }>>(
      WORKOUT_ENDPOINTS.TODAY,
    );
    return data.data.exercises;
  },

  /** Logs a completed workout (fully wired on Day 8). */
  async logWorkout(payload: WorkoutLogPayload): Promise<WorkoutLogResult> {
    const { data } = await apiClient.post<ApiEnvelope<WorkoutLogResult>>(
      WORKOUT_ENDPOINTS.LOG,
      payload,
    );
    return data.data;
  },
};
