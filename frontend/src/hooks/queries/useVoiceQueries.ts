import { useMutation, useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '../../constants/queryKeys';
import { voiceService } from '../../services/voiceService';
import { useInvalidate } from './queryHelpers';

export function useVoiceHistory(limit = 30) {
  return useQuery({
    queryKey: QUERY_KEYS.voice.history(limit),
    queryFn: () => voiceService.getVoiceHistory(limit),
  });
}

/** Uploads a recording for analysis; refreshes mood history, the dashboard and XP. */
export function useRecordVoiceCheckin() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (audio: Blob) => voiceService.recordAndAnalyze(audio),
    onSuccess: () =>
      invalidate(QUERY_KEYS.voice.all, QUERY_KEYS.dashboard.all, QUERY_KEYS.gamification.all),
  });
}
