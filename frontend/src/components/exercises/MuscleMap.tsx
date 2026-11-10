import { useMemo } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { STRINGS } from '../../constants/strings';
import { MUSCLE_AREAS } from '../../constants/exercises';
import type { BodyArea } from '../../constants/bodyDiagram';
import type { MuscleGroup } from '../../types/exercise';
import { BodyDiagram } from './BodyDiagram';
import { muscleMapStyles as styles } from './MuscleMap.styles';

const S = STRINGS.exercises;
const D = S.detail;

type MuscleMapProps = {
  primary: MuscleGroup[];
  secondary: MuscleGroup[];
  stabilizers: MuscleGroup[];
  /** Hide the stabiliser row (exercises without coaching notes have no stabiliser data). */
  showStabilizers?: boolean;
};

/** Strongest level per diagram area: 3 primary, 2 secondary, 1 stabiliser. */
function areaLevels(primary: MuscleGroup[], secondary: MuscleGroup[], stabilizers: MuscleGroup[]) {
  const levels = new Map<BodyArea, number>();
  const mark = (groups: MuscleGroup[], level: number) =>
    groups.forEach((group) =>
      MUSCLE_AREAS[group]?.forEach((area) => levels.set(area, Math.max(levels.get(area) ?? 0, level))),
    );
  mark(stabilizers, 1);
  mark(secondary, 2);
  mark(primary, 3);
  return levels;
}

function names(groups: MuscleGroup[]): string {
  return groups.length ? groups.map((g) => S.muscles[g] ?? g).join(', ') : D.none;
}

/**
 * Front and back body diagrams with the worked muscles shaded: darkest for
 * primary, lighter for secondary, lightest for stabilisers. The lists below
 * use the same colours, so they double as the legend.
 */
export function MuscleMap({ primary, secondary, stabilizers, showStabilizers = true }: MuscleMapProps) {
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  const colors = useMemo(() => {
    const main = theme.palette.primary.main;
    return [alpha(main, dark ? 0.35 : 0.28), alpha(main, dark ? 0.65 : 0.6), main];
  }, [theme, dark]);
  const bodyColor = dark ? theme.palette.grey[800] : theme.palette.grey[300];

  const levels = useMemo(() => areaLevels(primary, secondary, stabilizers), [primary, secondary, stabilizers]);

  const rows = [
    { label: D.primary, value: names(primary), color: colors[2] },
    { label: D.secondary, value: names(secondary), color: colors[1] },
    ...(showStabilizers ? [{ label: D.stabilizers, value: names(stabilizers), color: colors[0] }] : []),
  ];

  return (
    <Box>
      <Stack sx={styles.models}>
        {(['front', 'back'] as const).map((view) => (
          <BodyDiagram key={view} view={view} levels={levels} colors={colors} bodyColor={bodyColor} />
        ))}
      </Stack>

      <Stack sx={styles.rows}>
        {rows.map((row) => (
          <Stack key={row.label} sx={styles.row}>
            <Box sx={styles.swatch(row.color)} />
            <Typography variant="body2" sx={styles.rowLabel}>
              {row.label}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {row.value}
            </Typography>
          </Stack>
        ))}
      </Stack>
      <Typography variant="caption" color="text.secondary" component="p" sx={styles.hint}>
        {D.musclesHint}
      </Typography>
    </Box>
  );
}
