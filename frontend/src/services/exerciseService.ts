import { apiClient } from '../lib/apiClient';
import { EXERCISE_ENDPOINTS } from '../constants/api';
import type { ApiEnvelope } from '../types/auth';
import type { ExerciseDetail, ExerciseSearchParams, ExerciseSearchResult } from '../types/exercise';

/** Exercise library API. Unwraps the backend `{ success, message, data }` envelope. */
export const exerciseService = {
  async search(params: ExerciseSearchParams): Promise<ExerciseSearchResult> {
    const { data } = await apiClient.get<ApiEnvelope<ExerciseSearchResult>>(EXERCISE_ENDPOINTS.SEARCH, {
      params: {
        q: params.q || undefined,
        muscle: params.muscle || undefined,
        curated: params.curated || undefined,
      },
    });
    return data.data;
  },

  async get(id: string): Promise<ExerciseDetail> {
    const { data } = await apiClient.get<ApiEnvelope<ExerciseDetail>>(EXERCISE_ENDPOINTS.detail(id));
    return data.data;
  },
};
