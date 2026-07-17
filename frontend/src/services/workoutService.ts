import { apiClient } from '../lib/apiClient';
import { WORKOUT_ENDPOINTS } from '../constants/api';
import type { ApiEnvelope } from '../types/auth';
import type {
  Exercise,
  ExerciseCompleteResult,
  GeneratePlanPayload,
  WeeklyPlan,
  WorkoutHistoryItem,
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
};
