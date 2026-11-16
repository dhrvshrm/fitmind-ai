import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Skeleton,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  AutoAwesomeRounded,
  CloseRounded,
  OpenInNewRounded,
  RemoveCircleOutlineRounded,
  UndoRounded,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import { BIOMARKER_STATUS_COLOR } from '../../../constants/labReports';
import { LAB_REPORT_STRINGS } from '../../../constants/labReportStrings';
import { BODY_SCAN_STRINGS } from '../../../constants/bodyScanStrings';
import { useConfirmBodyScan, useConfirmLabReport, useLabReport } from '../../../hooks/queries/useLabReportQueries';
import { queryErrorMessage } from '../../../hooks/queries/queryHelpers';
import { resolveApiError } from '../../../lib/apiClient';
import type { BiomarkerStatus, DraftValue, LabReport, ReportKind } from '../../../types/labReports';
import { ErrorState } from '../../ui/ErrorState';
import { BodyScanForm } from './BodyScanForm';
import { openReportFile } from './openReportFile';
import { reportReviewDialogStyles as styles } from './ReportReviewDialog.styles';

const S = LAB_REPORT_STRINGS.review;
const R = LAB_REPORT_STRINGS.results;
const { fmtNumber, fmtRange } = LAB_REPORT_STRINGS;

type Row = { draft: DraftValue; value: string; unit: string; removed: boolean };

type ReportReviewDialogProps = {
  reportId: string;
  onClose: () => void;
  /** After a save: offer to update the plans with the new results. */
  onSaved: (kind: ReportKind) => void;
};

const parse = (text: string) => {
  const value = Number(text.trim().replace(',', '.'));
  return text.trim() !== '' && Number.isFinite(value) && value >= 0 ? value : null;
};

function statusOf(value: number | null, low: number | null, high: number | null): BiomarkerStatus {
  if (value === null || (low === null && high === null)) return 'unknown';
  if (low !== null && value < low) return 'low';
  if (high !== null && value > high) return 'high';
  return 'in_range';
}

/** The review step: every value read from the report, to check, fix or remove, then save. */
export function ReportReviewDialog({ reportId, onClose, onSaved }: ReportReviewDialogProps) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const report = useLabReport(reportId);
  const confirmScan = useConfirmBodyScan();
  const error = queryErrorMessage(report.error, LAB_REPORT_STRINGS.list.loadError);
  const scan = report.data?.kind === 'body_composition';
  const B = BODY_SCAN_STRINGS.form;
  const draft = report.data?.scan_draft;
  const read = Boolean(draft && (Object.keys(draft).length > 1 || Object.keys(draft.segments ?? {}).length));
  const byAi = report.data?.methods.includes('ai');
  const scanNotice = report.data?.ai_error
    ? B.aiFailed
    : !read
      ? B.nothingRead
      : byAi
        ? B.readByAi
        : B.readLocal;

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="md" fullScreen={fullScreen} scroll="paper">
      <DialogTitle component="div" sx={styles.title}>
        <Box>
          <Typography variant="h6" component="h2">
            {scan ? B.reviewTitle : S.title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {scan ? B.reviewSubtitle : S.subtitle}
          </Typography>
        </Box>
        <IconButton aria-label={S.close} onClick={onClose}>
          <CloseRounded />
        </IconButton>
      </DialogTitle>
      {error && !report.data && (
        <DialogContent dividers>
          <ErrorState message={error} onRetry={() => report.refetch()} />
        </DialogContent>
      )}
      {!report.data && !error && (
        <DialogContent dividers>
          <Skeleton variant="rounded" height={260} />
        </DialogContent>
      )}
      {/* Keyed by report so the rows start from its drafts once they've loaded. */}
      {report.data && scan && (
        <BodyScanForm
          key={report.data.id}
          initial={{ ...draft, measured_at: draft?.measured_at ?? report.data.report_date ?? null }}
          notice={scanNotice}
          submit={(body) => confirmScan.mutateAsync({ id: reportId, body })}
          saving={confirmScan.isPending}
          onDone={onClose}
          onSaved={() => onSaved('body_composition')}
          cancelLabel={B.later}
          extra={
            <Button
              size="small"
              startIcon={<OpenInNewRounded />}
              onClick={() => void openReportFile(reportId, B.openError)}
            >
              {B.openFile}
            </Button>
          }
        />
      )}
      {report.data && !scan && (
        <ReviewForm key={report.data.id} report={report.data} onClose={onClose} onSaved={() => onSaved('blood')} />
      )}
    </Dialog>
  );
}

function ReviewForm({ report, onClose, onSaved }: { report: LabReport; onClose: () => void; onSaved: () => void }) {
  const confirm = useConfirmLabReport();
  const [date, setDate] = useState(report.report_date ?? report.created_at.slice(0, 10));
  const [rows, setRows] = useState<Row[]>(() =>
    (report.drafts ?? []).map((draft) => ({
      draft,
      value: fmtNumber(draft.value),
      unit: draft.unit,
      removed: false,
    })),
  );
  const kept = rows.filter((row) => !row.removed);
  const removedCount = rows.length - kept.length;
  const invalid = kept.some((row) => parse(row.value) === null);

  function update(id: string, patch: Partial<Row>) {
    setRows((current) => current.map((row) => (row.draft.id === id ? { ...row, ...patch } : row)));
  }

  async function handleSave() {
    if (invalid) {
      toast.error(S.invalid);
      return;
    }
    try {
      const result = await confirm.mutateAsync({
        id: report.id,
        reportDate: date || null,
        values: kept.map(({ draft, value, unit }) => ({
          code: draft.code,
          name: draft.name,
          value: parse(value)!,
          unit: unit.trim(),
          ref_low: draft.ref_source === 'lab' ? draft.ref_low : null,
          ref_high: draft.ref_source === 'lab' ? draft.ref_high : null,
        })),
      });
      toast.success(S.saved(result.saved));
      onSaved();
      onClose();
    } catch (err) {
      toast.error(resolveApiError(err, S.error));
    }
  }

  return (
    <>
      <DialogContent dividers>
        <Stack sx={styles.toolbar}>
          <TextField
            type="date"
            size="small"
            label={S.reportDate}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            sx={styles.date}
          />
          <Button
            size="small"
            startIcon={<OpenInNewRounded />}
            onClick={() => void openReportFile(report.id, S.openError)}
          >
            {S.viewFile}
          </Button>
        </Stack>

        {report.ai_error && (
          <Alert severity="info" variant="outlined" sx={styles.alert}>
            {S.aiFailed}
          </Alert>
        )}

        {rows.length === 0 ? (
          <Alert severity="warning" variant="outlined">
            <Typography variant="body2" sx={styles.noneTitle}>
              {S.noneFound}
            </Typography>
            <Typography variant="body2">{S.noneFoundAi}</Typography>
          </Alert>
        ) : (
          <Box component="ul" sx={styles.list}>
            {rows.map((row) => {
              const { draft } = row;
              const value = parse(row.value);
              const status = statusOf(value, draft.ref_low, draft.ref_high);
              const range = fmtRange(draft.ref_low, draft.ref_high, draft.unit);
              return (
                <Box component="li" key={draft.id} sx={styles.row(row.removed)}>
                  <Box sx={styles.rowMain}>
                    <Stack sx={styles.nameLine}>
                      <Typography variant="body2" sx={styles.name}>
                        {draft.name}
                      </Typography>
                      {!row.removed && value !== null && status !== 'unknown' && (
                        <Chip
                          size="small"
                          variant="outlined"
                          color={BIOMARKER_STATUS_COLOR[status]}
                          label={R.status[status]}
                        />
                      )}
                    </Stack>
                    {range && (
                      <Typography variant="caption" color="text.secondary">
                        {S.range(range, draft.ref_source === 'standard')}
                      </Typography>
                    )}
                    {!row.removed && (draft.source === 'ai' || !draft.unit_checked) && (
                      <Stack sx={styles.flag}>
                        <AutoAwesomeRounded sx={styles.flagIcon} />
                        <Typography variant="caption">
                          {draft.source === 'ai' ? S.readByAi : S.unitUnchecked}
                        </Typography>
                      </Stack>
                    )}
                  </Box>
                  {row.removed ? (
                    <Button
                      size="small"
                      startIcon={<UndoRounded />}
                      onClick={() => update(draft.id, { removed: false })}
                    >
                      {S.restore}
                    </Button>
                  ) : (
                    <Stack sx={styles.fields}>
                      <TextField
                        size="small"
                        label={S.value}
                        value={row.value}
                        error={value === null}
                        onChange={(e) => update(draft.id, { value: e.target.value })}
                        slotProps={{ htmlInput: { inputMode: 'decimal' } }}
                        sx={styles.valueField}
                      />
                      <TextField
                        size="small"
                        label={S.unit}
                        value={row.unit}
                        onChange={(e) => update(draft.id, { unit: e.target.value })}
                        sx={styles.unitField}
                      />
                      <Tooltip title={S.remove(draft.name)}>
                        <IconButton
                          aria-label={S.remove(draft.name)}
                          onClick={() => update(draft.id, { removed: true })}
                        >
                          <RemoveCircleOutlineRounded fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  )}
                </Box>
              );
            })}
          </Box>
        )}
        {removedCount > 0 && (
          <Typography variant="caption" color="text.secondary" component="p" sx={styles.removedNote}>
            {S.removed(removedCount)}
          </Typography>
        )}
      </DialogContent>
      <DialogActions sx={styles.actions}>
        <Button onClick={onClose}>{S.later}</Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={confirm.isPending || kept.length === 0}
          startIcon={confirm.isPending ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          {confirm.isPending ? S.saving : S.save(kept.length)}
        </Button>
      </DialogActions>
    </>
  );
}
