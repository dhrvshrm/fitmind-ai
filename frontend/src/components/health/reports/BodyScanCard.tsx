import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogTitle,
  IconButton,
  Skeleton,
  Stack,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  AccessibilityNewRounded,
  AddRounded,
  ArrowForwardRounded,
  DeleteOutlineRounded,
  InfoOutlined,
  TipsAndUpdatesRounded,
} from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';
import toast from 'react-hot-toast';
import { BODY_SCAN_STRINGS } from '../../../constants/bodyScanStrings';
import { ROUTES } from '../../../constants/routes';
import { useAddBodyScan, useBodyScans, useDeleteBodyScan } from '../../../hooks/queries/useLabReportQueries';
import { useWeeklyPlan } from '../../../hooks/queries/useWorkoutQueries';
import { queryErrorMessage } from '../../../hooks/queries/queryHelpers';
import { resolveApiError } from '../../../lib/apiClient';
import type { BodyScan, BodyScanFieldKey } from '../../../types/bodyScan';
import { EmptyState } from '../../ui/EmptyState';
import { ErrorState } from '../../ui/ErrorState';
import { SectionCard } from '../../ui/SectionCard';
import { BodyMap } from './BodyMap';
import { BodyScanForm } from './BodyScanForm';
import { GoalAdviceAlert } from './GoalAdviceAlert';
import { bodyScanCardStyles as styles } from './BodyScanCard.styles';

const S = BODY_SCAN_STRINGS;
const STATS: BodyScanFieldKey[] = [
  'weight_kg',
  'skeletal_muscle_mass_kg',
  'body_fat_percent',
  'body_fat_mass_kg',
  'visceral_fat_level',
  'bmr_kcal',
];

const fmt = (value: number) => (Number.isInteger(value) ? String(value) : value.toFixed(1));

/** The latest body composition scan: key numbers, muscle by body part, and what the plan does about it. */
export function BodyScanCard({ onSaved }: { onSaved: () => void }) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const scans = useBodyScans();
  const plan = useWeeklyPlan();
  const add = useAddBodyScan();
  const remove = useDeleteBodyScan();
  const [adding, setAdding] = useState(false);
  const error = queryErrorMessage(scans.error, S.card.loadError);
  const latest = scans.data?.[0];
  const earlier = scans.data?.slice(1) ?? [];

  async function handleDelete(scan: BodyScan) {
    try {
      await remove.mutateAsync(scan.id);
      toast.success(S.card.deleted);
    } catch (err) {
      toast.error(resolveApiError(err, S.card.deleteError));
    }
  }

  return (
    <SectionCard
      title={S.card.title}
      subtitle={latest ? S.card.subtitle : undefined}
      action={
        <Button size="small" startIcon={<AddRounded />} onClick={() => setAdding(true)}>
          {S.card.add}
        </Button>
      }
    >
      {scans.isPending && <Skeleton variant="rounded" height={200} />}
      {error && !scans.data && <ErrorState message={error} onRetry={() => scans.refetch()} />}
      {scans.data && !latest && (
        <EmptyState icon={AccessibilityNewRounded} title={S.card.empty} description={S.card.emptyBody} compact />
      )}

      {latest && (
        <Box sx={styles.content}>
          <Stack sx={styles.dateRow}>
            <Typography variant="caption" color="text.secondary">
              {S.card.scanned(latest.measured_at, latest.device)}
            </Typography>
            <Tooltip title={S.card.deleteAria(latest.measured_at)}>
              <IconButton
                size="small"
                aria-label={S.card.deleteAria(latest.measured_at)}
                onClick={() => handleDelete(latest)}
                disabled={remove.isPending}
              >
                <DeleteOutlineRounded fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>

          <Box component="dl" sx={styles.stats}>
            {STATS.filter((key) => latest[key] != null).map((key) => {
              const change = latest.changes[key];
              return (
                <Box key={key} sx={styles.stat}>
                  <Typography component="dt" variant="caption" color="text.secondary">
                    {S.fields[key]}
                  </Typography>
                  <Typography component="dd" sx={styles.statValue}>
                    {fmt(latest[key] as number)}
                    <Typography component="span" variant="body2" color="text.secondary">
                      {S.units[key] ? ` ${S.units[key]}` : ''}
                    </Typography>
                  </Typography>
                  {change !== undefined && change !== 0 && (
                    <Typography variant="caption" sx={styles.change}>
                      {change > 0 ? '+' : ''}
                      {fmt(change)} {S.units[key]}
                    </Typography>
                  )}
                </Box>
              );
            })}
          </Box>
          {Object.keys(latest.changes).length > 0 && (
            <Typography variant="caption" color="text.secondary">
              {S.card.sinceLast}
            </Typography>
          )}

          {latest.segments && Object.keys(latest.segments).length > 0 && <BodyMap scan={latest} />}

          <Box>
            <Typography variant="body2" sx={styles.findingsTitle}>
              {S.card.findingsTitle}
            </Typography>
            <Box component="ul" sx={styles.findings}>
              {latest.analysis.findings.map((finding) => (
                <Box component="li" key={finding.code} sx={styles.finding}>
                  <TipsAndUpdatesRounded sx={styles.findingIcon} />
                  <Typography variant="body2">{S.finding(finding)}</Typography>
                </Box>
              ))}
            </Box>
          </Box>

          {latest.goal_advice && <GoalAdviceAlert key={latest.id} advice={latest.goal_advice} />}

          {plan.data?.scan_changed && (
            <Alert
              severity="info"
              variant="outlined"
              action={
                <Button component={RouterLink} to={ROUTES.WORKOUTS} size="small" endIcon={<ArrowForwardRounded />}>
                  {S.card.makePlan}
                </Button>
              }
            >
              {S.card.planHint}
            </Alert>
          )}

          {earlier.length > 0 && (
            <Box>
              <Typography variant="body2" sx={styles.findingsTitle}>
                {S.card.history}
              </Typography>
              <Box component="ul" sx={styles.history}>
                {earlier.map((scan) => (
                  <Box component="li" key={scan.id} sx={styles.historyRow}>
                    <Typography variant="body2" color="text.secondary">
                      {S.fmtDate(scan.measured_at)}
                    </Typography>
                    <Typography variant="body2" sx={styles.historyValues}>
                      {[
                        scan.weight_kg != null ? `${fmt(scan.weight_kg)} kg` : null,
                        scan.skeletal_muscle_mass_kg != null
                          ? `${S.changes.skeletal_muscle_mass_kg} ${fmt(scan.skeletal_muscle_mass_kg)} kg`
                          : null,
                        scan.body_fat_percent != null ? `${S.changes.body_fat_percent} ${fmt(scan.body_fat_percent)}%` : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </Typography>
                    <Tooltip title={S.card.deleteAria(scan.measured_at)}>
                      <IconButton
                        size="small"
                        aria-label={S.card.deleteAria(scan.measured_at)}
                        onClick={() => handleDelete(scan)}
                        disabled={remove.isPending}
                      >
                        <DeleteOutlineRounded fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                ))}
              </Box>
            </Box>
          )}

          <Stack sx={styles.disclaimer}>
            <InfoOutlined sx={styles.disclaimerIcon} />
            <Typography variant="caption" color="text.secondary">
              {S.card.disclaimer}
            </Typography>
          </Stack>
        </Box>
      )}

      <Dialog open={adding} onClose={() => setAdding(false)} fullWidth maxWidth="sm" fullScreen={fullScreen} scroll="paper">
        <DialogTitle component="div">
          <Typography variant="h6" component="h2">
            {S.form.addTitle}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {S.form.addSubtitle}
          </Typography>
        </DialogTitle>
        {adding && (
          <BodyScanForm
            submit={(body) => add.mutateAsync(body)}
            saving={add.isPending}
            onDone={() => setAdding(false)}
            onSaved={onSaved}
            cancelLabel={S.form.cancel}
          />
        )}
      </Dialog>
    </SectionCard>
  );
}
