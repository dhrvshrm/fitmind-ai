import { useMemo } from 'react';
import {
  Box,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Skeleton,
  Stack,
  Typography,
  useTheme,
} from '@mui/material';
import { MicRounded } from '@mui/icons-material';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { STRINGS } from '../../constants/strings';
import { formatDateLabel } from '../../utils/date';
import {
  getMoodChartColors,
  getMoodSentiment,
  MOOD_COLOR_TOKEN,
  MOOD_ICON,
  MOOD_LABEL,
  type MoodSentiment,
} from '../../utils/voiceCheckin';
import type { VoiceHistoryItem } from '../../types/voiceCheckin';
import { useChartTheme } from '../../hooks/useChartTheme';
import { useVoiceHistory } from '../../hooks/queries/useVoiceQueries';
import { queryErrorMessage } from '../../hooks/queries/queryHelpers';
import { SectionCard } from '../ui/SectionCard';
import { EmptyState } from '../ui/EmptyState';
import { ErrorState } from '../ui/ErrorState';
import { moodHistoryStyles as styles } from './MoodHistory.styles';

const S = STRINGS.voiceCheckin.history;
const LIST_LIMIT = 7;
const SENTIMENTS: MoodSentiment[] = ['positive', 'neutral', 'low'];

type ChartPoint = VoiceHistoryItem & { label: string; sentiment: MoodSentiment };

type DotProps = {
  cx?: number;
  cy?: number;
  payload?: ChartPoint;
  colors: Record<MoodSentiment, string>;
  ringColor: string;
};

/** Energy dot colored by that day's mood sentiment (mood text is in the tooltip). */
function MoodDot({ cx, cy, payload, colors, ringColor }: DotProps) {
  if (cx === undefined || cy === undefined || !payload) return null;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={5}
      fill={colors[payload.sentiment]}
      stroke={ringColor}
      strokeWidth={2}
    />
  );
}

/** Energy-over-time chart with mood-colored points, plus a recent check-in list. */
export function MoodHistory() {
  const chart = useChartTheme();
  const moodColors = getMoodChartColors(useTheme().palette);
  const history = useVoiceHistory();
  const error = queryErrorMessage(history.error, S.error);
  const items = useMemo(() => history.data ?? [], [history.data]);

  // Chart reads left->right, so flip the newest-first API order.
  const data = useMemo<ChartPoint[]>(
    () =>
      [...items].reverse().map((item) => ({
        ...item,
        label: formatDateLabel(item.date),
        sentiment: getMoodSentiment(item.mood),
      })),
    [items],
  );

  const recent = items.slice(0, LIST_LIMIT);
  const isEmpty = history.isSuccess && items.length === 0;

  return (
    <Box sx={styles.stack}>
      <SectionCard title={S.chartTitle}>
        {history.isPending && <Skeleton variant="rounded" sx={styles.chartWrap} />}
        {error && <ErrorState message={error} onRetry={() => history.refetch()} />}
        {isEmpty && (
          <EmptyState icon={MicRounded} title={S.emptyTitle} description={S.empty} compact />
        )}

        {data.length > 0 && (
          <>
            <Box sx={styles.chartWrap}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke={chart.grid} vertical={false} />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tick={chart.tick}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    domain={[0, 10]}
                    ticks={[0, 2, 4, 6, 8, 10]}
                    tickLine={false}
                    axisLine={false}
                    tick={chart.tick}
                  />
                  <Tooltip
                    contentStyle={chart.tooltip}
                    labelStyle={chart.tooltipLabel}
                    itemStyle={chart.tooltipItem}
                    formatter={(value, _name, entry) => {
                      const point = entry?.payload as ChartPoint | undefined;
                      const energy = value as number;
                      return [point ? S.tooltipValue(energy, point.mood) : energy, S.tooltipEnergy];
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="energy"
                    stroke={chart.purple}
                    strokeWidth={2}
                    dot={<MoodDot colors={moodColors} ringColor={chart.surface} />}
                    activeDot={{ r: 6, stroke: chart.surface, strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Box>

            {/* Sentiment legend for the dot colors. */}
            <Stack sx={styles.legendRow}>
              {SENTIMENTS.map((sentiment) => (
                <Stack key={sentiment} sx={styles.legendItem}>
                  <Box component="span" sx={styles.legendDot(moodColors[sentiment])} />
                  <Typography variant="caption" color="text.secondary">
                    {MOOD_LABEL[sentiment]}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          </>
        )}
      </SectionCard>

      <SectionCard title={S.listTitle} flush={recent.length > 0}>
        {history.isPending && <Skeleton variant="rounded" sx={styles.listSkeleton} />}
        {error && <ErrorState message={error} onRetry={() => history.refetch()} />}
        {isEmpty && (
          <EmptyState icon={MicRounded} title={S.emptyTitle} description={S.empty} compact />
        )}

        {recent.length > 0 && (
          <List disablePadding sx={styles.list}>
            {recent.map((item, index) => {
              const sentiment = getMoodSentiment(item.mood);
              const MoodIcon = MOOD_ICON[sentiment];
              return (
                <ListItem
                  key={`${item.date}-${index}`}
                  divider={index < recent.length - 1}
                  sx={styles.item}
                >
                  <ListItemIcon sx={styles.listIconWrap}>
                    <MoodIcon sx={styles.listIcon(MOOD_COLOR_TOKEN[sentiment])} aria-hidden />
                  </ListItemIcon>
                  <ListItemText
                    primary={item.mood}
                    secondary={formatDateLabel(item.date)}
                    slotProps={{ primary: { sx: styles.listMood } }}
                  />
                  <Chip
                    label={S.energyValue(item.energy)}
                    size="small"
                    color="primary"
                    variant="outlined"
                    sx={styles.energyChip}
                  />
                </ListItem>
              );
            })}
          </List>
        )}
      </SectionCard>
    </Box>
  );
}
