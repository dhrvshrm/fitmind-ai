import { useMutation, useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '../../constants/queryKeys';
import { reportService } from '../../services/reportService';
import { useInvalidate } from './queryHelpers';

export function useReportHistory() {
  return useQuery({ queryKey: QUERY_KEYS.reports.history, queryFn: reportService.getHistory });
}

export function useLatestReport() {
  return useQuery({ queryKey: QUERY_KEYS.reports.latest, queryFn: reportService.getLatest });
}

export function useReport(id: string | null) {
  return useQuery({
    queryKey: QUERY_KEYS.reports.byId(id ?? ''),
    queryFn: () => reportService.getById(id as string),
    enabled: Boolean(id),
  });
}

export function useGenerateReport() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: reportService.generate,
    onSuccess: () => invalidate(QUERY_KEYS.reports.all),
  });
}
