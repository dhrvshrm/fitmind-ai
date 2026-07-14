import { useMemo } from 'react';
import {
  Alert,
  Box,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
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
  getMoodSentiment,
  MOOD_CHART_COLOR,
  MOOD_EMOJI,
  MOOD_LABEL,
  type MoodSentiment,
} from '../../utils/voiceCheckin';
import type { VoiceHistoryItem } from '../../types/voiceCheckin';
import {
  moodChartTheme as chart,
  moodHistoryStyles as styles,
} from './MoodHistory.styles';

const S = STRINGS.voiceCheckin.history;
const LIST_LIMIT = 7;
const SENTIMENTS: MoodSentiment[] = ['positive', 'neutral', 'low'];

type ChartPoint = VoiceHistoryItem & { label: string; sentiment: MoodSentiment };

type DotProps = {
  cx?: number;
  cy?: number;
  payload?: ChartPoint;
};

/** Energy dot colored by that day's mood sentiment (mood text is in the tooltip). */
function MoodDot({ cx, cy, payload }: DotProps) {
  if (cx === undefined || cy === undefined || !payload) return null;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={5}
      fill={MOOD_CHART_COLOR[payload.sentiment]}
      stroke={chart.dotStroke}
      strokeWidth={2}
    />
  );
}

type MoodHistoryProps = {
  /** History items as returned by the API (newest first). */
  items: VoiceHistoryItem[];
  loading: boolean;
  error: string | null;
};

/** Energy-over-time chart with mood-colored points, plus a recent check-in list. */
export function MoodHistory({ items, loading, error }: MoodHistoryProps) {
  // Chart reads left→right, so flip the newest-first API order.
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

  return (
    <Box sx={styles.stack}>
      <Paper variant="outlined" sx={styles.card}>
        <Typography variant="h6" sx={styles.title}>
          {S.chartTitle}
        </Typography>

        {loading && <Skeleton variant="rounded" sx={styles.chartWrap} />}
        {!loading && error && <Alert severity="error">{error}</Alert>}
        {!loading && !error && data.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={styles.empty}>
            {S.empty}
          </Typography>
        )}

        {!loading && !error && data.length > 0 && (
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
                    formatter={(value, _name, entry) => {
                      const point = entry?.payload as ChartPoint | undefined;
                      const mood = point ? ` · ${point.mood}` : '';
                      return [`${value as number}${mood}`, S.tooltipEnergy];
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="energy"
                    stroke={chart.line}
                    strokeWidth={2}
                    dot={<MoodDot />}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Box>

            {/* Sentiment legend for the dot colors. */}
            <Stack sx={styles.legendRow}>
              {SENTIMENTS.map((sentiment) => (
                <Stack key={sentiment} sx={styles.legendItem}>
                  <Box component="span" sx={styles.legendDot(MOOD_CHART_COLOR[sentiment])} />
                  <Typography variant="caption" color="text.secondary">
                    {MOOD_LABEL[sentiment]}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          </>
        )}
      </Paper>

      <Paper variant="outlined" sx={styles.card}>
        <Typography variant="h6" sx={styles.title}>
          {S.listTitle}
        </Typography>

        {loading && <Skeleton variant="rounded" height={160} />}
        {!loading && !error && recent.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={styles.empty}>
            {S.empty}
          </Typography>
        )}

        {!loading && !error && recent.length > 0 && (
          <List disablePadding>
            {recent.map((item, index) => {
              const sentiment = getMoodSentiment(item.mood);
              return (
                <ListItem key={`${item.date}-${index}`} divider={index < recent.length - 1}>
                  <ListItemIcon>
                    <Typography component="span" sx={styles.listEmoji} aria-hidden>
                      {MOOD_EMOJI[sentiment]}
                    </Typography>
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography component="span" sx={styles.listMood}>
                        {item.mood}
                      </Typography>
                    }
                    secondary={formatDateLabel(item.date)}
                  />
                  <Chip
                    label={`${item.energy}/10`}
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
      </Paper>
    </Box>
  );
}
