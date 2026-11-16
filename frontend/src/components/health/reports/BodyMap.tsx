import { Box, Typography, alpha, useTheme } from '@mui/material';
import { BODY_SCAN_STRINGS } from '../../../constants/bodyScanStrings';
import type { BodyScan, SegmentKey, SegmentStatus } from '../../../types/bodyScan';
import { bodyMapStyles as styles } from './BodyMap.styles';

const S = BODY_SCAN_STRINGS;

/** The bars run from 50% to 150% of standard; the standard band is 90–110%. */
const SCALE_MIN = 50;
const SCALE_MAX = 150;
const BAND = [90, 110] as const;
const ORDER: SegmentKey[] = ['left_arm', 'right_arm', 'trunk', 'left_leg', 'right_leg'];

/**
 * Body outline, front view as printouts show it: the person's right is on
 * the viewer's left. Shapes are mirrored for the left side.
 */
const SHAPES: Record<SegmentKey, string> = {
  trunk:
    'M66 66 C80 58 120 58 134 66 C141 92 138 116 134 138 C131 156 133 174 132 192 C112 196 88 196 68 192 C67 174 69 156 66 138 C62 116 59 92 66 66 Z',
  right_arm:
    'M61 68 C47 71 40 84 38 102 C36 122 33 144 31 166 C30 180 30 194 34 204 C38 211 49 210 51 201 C53 186 55 168 57 150 C59 130 61 110 63 92 Z',
  left_arm:
    'M139 68 C153 71 160 84 162 102 C164 122 167 144 169 166 C170 180 170 194 166 204 C162 211 151 210 149 201 C147 186 145 168 143 150 C141 130 139 110 137 92 Z',
  right_leg:
    'M68 196 C78 200 90 200 99 198 C99 224 98 250 96 276 C95 300 94 322 93 340 C92 352 77 352 76 340 C73 316 71 292 70 268 C68 242 67 218 68 196 Z',
  left_leg:
    'M132 196 C122 200 110 200 101 198 C101 224 102 250 104 276 C105 300 106 322 107 340 C108 352 123 352 124 340 C127 316 129 292 130 268 C132 242 133 218 132 196 Z',
};
/** Where each part's % label sits on the figure. */
const LABEL_AT: Record<SegmentKey, [number, number]> = {
  trunk: [100, 128],
  right_arm: [45, 150],
  left_arm: [155, 150],
  right_leg: [84, 268],
  left_leg: [116, 268],
};

const pct = (value: number) => Math.round(value);
const toX = (value: number) =>
  ((Math.min(Math.max(value, SCALE_MIN), SCALE_MAX) - SCALE_MIN) / (SCALE_MAX - SCALE_MIN)) * 100;

/**
 * Muscle by body part: a figure with each part shaded by its muscle against
 * the standard for the person's height and weight, beside InBody-style bars
 * (standard band shaded) so a weaker arm or leg stands out at a glance.
 */
export function BodyMap({ scan }: { scan: BodyScan }) {
  const theme = useTheme();
  const status = scan.analysis.segment_status;
  const colour = (s: SegmentStatus | null | undefined) =>
    s === 'under'
      ? theme.palette.warning.main
      : s === 'over'
        ? theme.palette.primary.main
        : s === 'normal'
          ? theme.palette.success.main
          : theme.palette.text.disabled;
  const segments = ORDER.filter((key) => scan.segments?.[key]);

  return (
    <Box>
      <Typography variant="body2" sx={styles.title}>
        {S.card.bodyMapTitle}
      </Typography>
      <Box sx={styles.layout}>
        <Box component="svg" viewBox="0 0 200 356" sx={styles.figure} role="img" aria-label={S.card.bodyMapAria}>
          <defs>
            <linearGradient id="body-sheen" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0" stopColor={theme.palette.common.white} stopOpacity="0" />
              <stop offset="0.45" stopColor={theme.palette.common.white} stopOpacity="0.18" />
              <stop offset="1" stopColor={theme.palette.common.white} stopOpacity="0" />
            </linearGradient>
          </defs>
          <circle cx="100" cy="30" r="19" fill={alpha(theme.palette.text.primary, 0.12)} />
          <rect x="93" y="47" width="14" height="14" rx="5" fill={alpha(theme.palette.text.primary, 0.12)} />
          {(Object.keys(SHAPES) as SegmentKey[]).map((key) => {
            const c = colour(status[key]);
            const known = Boolean(scan.segments?.[key]);
            return (
              <g key={key}>
                <path
                  d={SHAPES[key]}
                  fill={known ? alpha(c, 0.78) : alpha(theme.palette.text.primary, 0.08)}
                  stroke={known ? c : alpha(theme.palette.text.primary, 0.2)}
                  strokeWidth="1.5"
                />
                <path d={SHAPES[key]} fill="url(#body-sheen)" />
              </g>
            );
          })}
          {segments.map((key) => {
            const value = scan.segments?.[key]?.lean_percent;
            if (value == null) return null;
            const [x, y] = LABEL_AT[key];
            const narrow = key.endsWith('arm');
            return (
              <g key={key}>
                <rect
                  x={x - (narrow ? 15 : 18)}
                  y={y - 10}
                  width={narrow ? 30 : 36}
                  height="20"
                  rx="10"
                  fill={theme.palette.background.paper}
                  opacity="0.92"
                />
                <text
                  x={x}
                  y={y + 4}
                  textAnchor="middle"
                  fontSize={narrow ? 10 : 12}
                  fontWeight="700"
                  fill={theme.palette.text.primary}
                >
                  {pct(value)}%
                </text>
              </g>
            );
          })}
        </Box>

        <Box sx={styles.bars}>
          <Box sx={styles.scale}>
            <Typography variant="caption" color="text.secondary">
              {S.card.scaleCaption}
            </Typography>
          </Box>
          {segments.map((key) => {
            const seg = scan.segments![key]!;
            const s = status[key];
            const c = colour(s);
            return (
              <Box key={key} sx={styles.row}>
                <Box sx={styles.rowHead}>
                  <Typography variant="body2" sx={styles.rowName}>
                    {S.segments[key]}
                  </Typography>
                  <Typography variant="body2" sx={styles.rowValue}>
                    {seg.lean_kg != null ? `${seg.lean_kg} kg` : ''}
                    {seg.lean_kg != null && seg.lean_percent != null ? ' · ' : ''}
                    {seg.lean_percent != null ? `${pct(seg.lean_percent)}%` : ''}
                  </Typography>
                </Box>
                {seg.lean_percent != null && (
                  <Box sx={styles.track}>
                    <Box sx={styles.band(toX(BAND[0]), toX(BAND[1]))} />
                    <Box sx={styles.fill(toX(seg.lean_percent), c)} />
                    <Box sx={styles.hundred(toX(100))} />
                  </Box>
                )}
                {s && (
                  <Typography variant="caption" sx={styles.status(c)}>
                    {S.status[s]}
                  </Typography>
                )}
              </Box>
            );
          })}
          <Box sx={styles.legend}>
            <Box sx={styles.legendBand} />
            <Typography variant="caption" color="text.secondary">
              {S.card.bandLegend}
            </Typography>
          </Box>
        </Box>
      </Box>
      <Typography variant="caption" color="text.secondary" component="p" sx={styles.note}>
        {S.card.facingNote}
      </Typography>
    </Box>
  );
}
