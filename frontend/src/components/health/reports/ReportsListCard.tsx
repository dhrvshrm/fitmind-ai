import { useState } from 'react';
import { Box, Button, Chip, IconButton, Skeleton, Stack, Tooltip, Typography } from '@mui/material';
import {
  DeleteOutlineRounded,
  DescriptionRounded,
  ImageRounded,
  OpenInNewRounded,
  PlagiarismRounded,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import { BODY_SCAN_STRINGS } from '../../../constants/bodyScanStrings';
import { LAB_REPORT_STRINGS } from '../../../constants/labReportStrings';
import { useDeleteLabReport, useLabReports } from '../../../hooks/queries/useLabReportQueries';
import { queryErrorMessage } from '../../../hooks/queries/queryHelpers';
import { resolveApiError } from '../../../lib/apiClient';
import type { LabReport } from '../../../types/labReports';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { EmptyState } from '../../ui/EmptyState';
import { ErrorState } from '../../ui/ErrorState';
import { SectionCard } from '../../ui/SectionCard';
import { openReportFile } from './openReportFile';
import { reportsListCardStyles as styles } from './ReportsListCard.styles';

const S = LAB_REPORT_STRINGS.list;
const B = BODY_SCAN_STRINGS;

type ReportsListCardProps = {
  /** Opens the review step for a report that still needs checking. */
  onReview: (id: string) => void;
};

/** Every uploaded report: open the file, check its values, or delete it with its values. */
export function ReportsListCard({ onReview }: ReportsListCardProps) {
  const reports = useLabReports();
  const remove = useDeleteLabReport();
  const [deleting, setDeleting] = useState<LabReport | null>(null);
  const error = queryErrorMessage(reports.error, S.loadError);

  async function handleDelete() {
    if (!deleting) return;
    try {
      await remove.mutateAsync(deleting.id);
      toast.success(S.deleted);
      setDeleting(null);
    } catch (err) {
      toast.error(resolveApiError(err, S.error));
    }
  }

  const list = [...(reports.data ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at));

  return (
    <SectionCard title={S.title}>
      {reports.isPending && <Skeleton variant="rounded" height={96} />}
      {error && !reports.data && <ErrorState message={error} onRetry={() => reports.refetch()} />}
      {reports.data && list.length === 0 && (
        <EmptyState icon={PlagiarismRounded} title={S.empty} description={S.emptyBody} compact />
      )}
      {list.length > 0 && (
        <Box component="ul" sx={styles.list}>
          {list.map((report) => {
            const isPdf = report.mime_type === 'application/pdf';
            const Icon = isPdf ? DescriptionRounded : ImageRounded;
            const name = report.lab || report.filename || (isPdf ? S.pdf : S.photo);
            const review = report.status === 'needs_review';
            return (
              <Box component="li" key={report.id} sx={styles.row}>
                <Icon sx={styles.icon} />
                <Box sx={styles.text}>
                  <Typography variant="body2" sx={styles.name}>
                    {name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" component="p">
                    {report.kind === 'body_composition' ? `${B.kinds.body_composition} · ` : `${B.kinds.blood} · `}
                    {report.report_date ? S.tested(report.report_date) : S.uploaded(report.created_at)}
                  </Typography>
                  <Stack sx={styles.actions}>
                    {review ? (
                      <>
                        <Chip size="small" color="warning" variant="outlined" label={S.needsReview} />
                        <Button size="small" onClick={() => onReview(report.id)}>
                          {S.review}
                        </Button>
                      </>
                    ) : (
                      <Chip
                        size="small"
                        color="success"
                        variant="outlined"
                        label={report.kind === 'body_composition' ? S.scanSaved : S.confirmed(report.confirmed_count ?? 0)}
                      />
                    )}
                  </Stack>
                </Box>
                <Stack sx={styles.buttons}>
                  <Tooltip title={S.open}>
                    <IconButton
                      size="small"
                      aria-label={S.open}
                      onClick={() => void openReportFile(report.id, LAB_REPORT_STRINGS.review.openError)}
                    >
                      <OpenInNewRounded fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={S.delete}>
                    <IconButton size="small" aria-label={S.deleteAria(name)} onClick={() => setDeleting(report)}>
                      <DeleteOutlineRounded fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Box>
            );
          })}
        </Box>
      )}
      <ConfirmDialog
        open={Boolean(deleting)}
        title={S.deleteTitle}
        description={S.deleteBody}
        confirmLabel={S.delete}
        destructive
        loading={remove.isPending}
        onConfirm={handleDelete}
        onClose={() => setDeleting(null)}
      />
    </SectionCard>
  );
}
