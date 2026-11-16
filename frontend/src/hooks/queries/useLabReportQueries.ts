import { useMutation, useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '../../constants/queryKeys';
import { labReportService } from '../../services/labReportService';
import type { BiomarkerValueIn } from '../../types/labReports';
import { useInvalidate } from './queryHelpers';

/** Only asked once report consent is given (the endpoints need it). */
export function useLabReports(enabled = true) {
  return useQuery({ queryKey: QUERY_KEYS.labReports.list, queryFn: labReportService.list, enabled });
}

export function useLabReport(id: string | null) {
  return useQuery({
    queryKey: QUERY_KEYS.labReports.report(id ?? ''),
    queryFn: () => labReportService.get(id!),
    enabled: Boolean(id),
  });
}

export function useBiomarkerHistory(enabled = true) {
  return useQuery({ queryKey: QUERY_KEYS.labReports.biomarkers, queryFn: labReportService.history, enabled });
}

export function useBiomarkerCatalog(enabled = true) {
  return useQuery({
    queryKey: QUERY_KEYS.labReports.catalog,
    queryFn: labReportService.catalog,
    enabled,
    staleTime: Infinity,
  });
}

/**
 * Confirmed values shape meal plans, the health profile and supplement
 * suggestions, so any change refreshes those too.
 */
function useValuesChanged() {
  const invalidate = useInvalidate();
  return () =>
    invalidate(QUERY_KEYS.labReports.all, QUERY_KEYS.health.all, QUERY_KEYS.dietPlan.all, QUERY_KEYS.supplements.all);
}

export function useUploadLabReport() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ file, allowAi }: { file: File; allowAi: boolean }) => labReportService.upload(file, allowAi),
    onSuccess: () => invalidate(QUERY_KEYS.labReports.list),
  });
}

export function useConfirmLabReport() {
  const changed = useValuesChanged();
  return useMutation({
    mutationFn: ({ id, reportDate, values }: { id: string; reportDate: string | null; values: BiomarkerValueIn[] }) =>
      labReportService.confirm(id, reportDate, values),
    onSuccess: changed,
  });
}

export function useDeleteLabReport() {
  const changed = useValuesChanged();
  return useMutation({ mutationFn: labReportService.remove, onSuccess: changed });
}

export function useAddBiomarker() {
  const changed = useValuesChanged();
  return useMutation({ mutationFn: (value: BiomarkerValueIn) => labReportService.addValue(value), onSuccess: changed });
}

export function useDeleteBiomarker() {
  const changed = useValuesChanged();
  return useMutation({ mutationFn: labReportService.removeValue, onSuccess: changed });
}
