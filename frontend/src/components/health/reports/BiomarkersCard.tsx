import { useState } from 'react';
import { Box, Button, Chip, Collapse, IconButton, Skeleton, Stack, Tooltip, Typography, useTheme } from '@mui/material';
import { AddRounded, BiotechRounded, DeleteOutlineRounded, ExpandMoreRounded, InfoOutlined } from '@mui/icons-material';
import { Line, LineChart, ReferenceArea, ResponsiveContainer, Tooltip as ChartTooltip, YAxis } from 'recharts';
import toast from 'react-hot-toast';
import { BIOMARKER_STATUS_COLOR } from '../../../constants/labReports';
import { LAB_REPORT_STRINGS } from '../../../constants/labReportStrings';
import { useBiomarkerHistory, useDeleteBiomarker } from '../../../hooks/queries/useLabReportQueries';
import { queryErrorMessage } from '../../../hooks/queries/queryHelpers';
import { useChartTheme } from '../../../hooks/useChartTheme';
import { resolveApiError } from '../../../lib/apiClient';
import type { BiomarkerGroup } from '../../../types/labReports';
import { EmptyState } from '../../ui/EmptyState';
import { ErrorState } from '../../ui/ErrorState';
import { SectionCard } from '../../ui/SectionCard';
import { AddBiomarkerDialog } from './AddBiomarkerDialog';
import { biomarkersCardStyles as styles } from './BiomarkersCard.styles';

const S = LAB_REPORT_STRINGS.results;
const { fmtDate, fmtNumber, fmtRange } = LAB_REPORT_STRINGS;

/** Saved results per test: the latest value against its range, a trend, and earlier values. */
export function BiomarkersCard({ onSaved }: { onSaved: () => void }) {
  const history = useBiomarkerHistory();
  const [adding, setAdding] = useState(false);
  const error = queryErrorMessage(history.error, S.loadError);

  return (
    <SectionCard
      title={S.title}
      subtitle={S.subtitle}
      action={
        <Button size="small" startIcon={<AddRounded />} onClick={() => setAdding(true)}>
          {S.add}
        </Button>
      }
    >
      {history.isPending && <Skeleton variant="rounded" height={160} />}
      {error && !history.data && <ErrorState message={error} onRetry={() => history.refetch()} />}
      {history.data && history.data.length === 0 && (
        <EmptyState icon={BiotechRounded} title={S.empty} description={S.emptyBody} compact />
      )}
      {history.data && history.data.length > 0 && (
        <>
          <Box component="ul" sx={styles.list}>
            {history.data.map((group) => (
              <BiomarkerRow key={group.code} group={group} />
            ))}
          </Box>
          <Stack sx={styles.uses}>
            <InfoOutlined sx={styles.usesIcon} />
            <Typography variant="caption" color="text.secondary">
              {S.usesNote}
            </Typography>
          </Stack>
        </>
      )}
      {adding && <AddBiomarkerDialog onClose={() => setAdding(false)} onSaved={onSaved} />}
    </SectionCard>
  );
}

function BiomarkerRow({ group }: { group: BiomarkerGroup }) {
  const chart = useChartTheme();
  // The usual range is shaded green: inside it is where a value should sit.
  const theme = useTheme();
  const remove = useDeleteBiomarker();
  const [open, setOpen] = useState(false);
  const { latest, reference } = group;
  const range = fmtRange(reference.low, reference.high, latest.unit);
  const values = group.points.map((p) => p.value);
  const top = Math.max(...values, reference.high ?? 0);
  const bottom = Math.min(...values, reference.low ?? Infinity);

  async function handleDelete(id: string) {
    try {
      await remove.mutateAsync(id);
      toast.success(S.deleted);
    } catch (err) {
      toast.error(resolveApiError(err, S.error));
    }
  }

  return (
    <Box component="li" sx={styles.row}>
      <Box sx={styles.head}>
        <Box sx={styles.headText}>
          <Typography variant="caption" color="text.secondary">
            {S.categories[group.category] ?? S.categories.other}
          </Typography>
          <Typography variant="body1" sx={styles.name}>
            {group.name}
          </Typography>
          <Stack sx={styles.valueLine}>
            <Typography sx={styles.value}>
              {fmtNumber(latest.value)}
              <Typography component="span" variant="body2" color="text.secondary">
                {latest.unit ? ` ${latest.unit}` : ''}
              </Typography>
            </Typography>
            <Chip
              size="small"
              variant="outlined"
              color={BIOMARKER_STATUS_COLOR[latest.status]}
              label={S.status[latest.status]}
            />
          </Stack>
          <Typography variant="caption" color="text.secondary" component="p">
            {S.latest(latest.date)}
            {range ? ` · ${LAB_REPORT_STRINGS.review.range(range, reference.source === 'standard')}` : ''}
          </Typography>
        </Box>
        {/* A small trend with the usual range shaded, once there are two results. */}
        {group.points.length > 1 && (
          <Box sx={styles.spark} aria-hidden>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={group.points} margin={{ top: 6, right: 6, bottom: 6, left: 6 }}>
                <YAxis hide domain={[bottom * 0.9, top * 1.1]} />
                {(reference.low !== null || reference.high !== null) && (
                  <ReferenceArea
                    y1={reference.low ?? bottom * 0.9}
                    y2={reference.high ?? top * 1.1}
                    fill={theme.palette.success.main}
                    fillOpacity={0.14}
                    stroke="none"
                  />
                )}
                <ChartTooltip
                  contentStyle={chart.tooltip}
                  labelStyle={chart.tooltipLabel}
                  itemStyle={chart.tooltipItem}
                  labelFormatter={(_, payload) => (payload?.[0] ? fmtDate(payload[0].payload.date) : '')}
                  formatter={(value) => [`${value} ${latest.unit}`, group.name]}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={chart.brand}
                  strokeWidth={2}
                  dot={{ r: 3, fill: chart.brand, stroke: chart.surface, strokeWidth: 2 }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </Box>
        )}
      </Box>

      <Button
        size="small"
        onClick={() => setOpen((v) => !v)}
        endIcon={<ExpandMoreRounded sx={styles.chevron(open)} />}
        sx={styles.toggle}
      >
        {group.points.length > 1 ? `${S.history} (${S.tests(group.points.length)})` : S.tests(1)}
      </Button>
      <Collapse in={open} unmountOnExit>
        {group.about && (
          <Typography variant="body2" color="text.secondary" sx={styles.about}>
            {group.about}
          </Typography>
        )}
        <Box component="ul" sx={styles.points}>
          {[...group.points].reverse().map((point) => (
            <Box component="li" key={point.id} sx={styles.point}>
              <Typography variant="body2" sx={styles.pointDate}>
                {fmtDate(point.date)}
              </Typography>
              <Typography variant="body2" sx={styles.pointValue}>
                {fmtNumber(point.value)} {point.unit}
              </Typography>
              <Chip
                size="small"
                variant="outlined"
                color={BIOMARKER_STATUS_COLOR[point.status]}
                label={S.status[point.status]}
              />
              <Tooltip title={S.deleteAria(point.date)}>
                <IconButton
                  size="small"
                  aria-label={S.deleteAria(point.date)}
                  onClick={() => handleDelete(point.id)}
                  disabled={remove.isPending}
                >
                  <DeleteOutlineRounded fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          ))}
        </Box>
        {group.source && (
          <Typography variant="caption" color="text.secondary" component="p" sx={styles.source}>
            {S.source(group.source)}
          </Typography>
        )}
      </Collapse>
    </Box>
  );
}
