import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '../../constants/queryKeys';
import { exerciseService } from '../../services/exerciseService';
import type { MuscleGroup } from '../../types/exercise';

/** Library search; the catalogue never changes at runtime, so results stay fresh. */
export function useExerciseSearch(query: string, muscle: MuscleGroup | '', curatedOnly: boolean) {
  const trimmed = query.trim();
  return useQuery({
    queryKey: QUERY_KEYS.exercises.search(trimmed, muscle, curatedOnly),
    queryFn: () => exerciseService.search({ q: trimmed, muscle: muscle || undefined, curated: curatedOnly }),
    enabled: trimmed.length !== 1,
    staleTime: Infinity,
    placeholderData: (previous) => previous,
  });
}

export function useExerciseDetail(id: string | null) {
  return useQuery({
    queryKey: QUERY_KEYS.exercises.detail(id ?? ''),
    queryFn: () => exerciseService.get(id as string),
    enabled: Boolean(id),
    staleTime: Infinity,
  });
}
