import { useState } from 'react';
import { Box, Tooltip, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { STRINGS } from '../../constants/strings';
import { anteriorData, posteriorData, type BodyArea } from '../../constants/bodyDiagram';
import { NON_MUSCLE_AREAS } from '../../constants/exercises';
import { bodyDiagramStyles as styles } from './BodyDiagram.styles';

const S = STRINGS.exercises;

type BodyDiagramProps = {
  view: 'front' | 'back';
  /** 0-3 per area: not worked, stabiliser, secondary, primary. */
  levels: ReadonlyMap<BodyArea, number>;
  /** Fill per level 1-3 (index 0 is level 1). */
  colors: string[];
  bodyColor: string;
};

/**
 * One view of the body with worked muscles shaded. Hovering (or tapping)
 * a muscle shows its name and how much this exercise uses it.
 */
export function BodyDiagram({ view, levels, colors, bodyColor }: BodyDiagramProps) {
  const theme = useTheme();
  const [hovered, setHovered] = useState<BodyArea | null>(null);
  const shapes = view === 'front' ? anteriorData : posteriorData;
  const label = view === 'front' ? S.detail.front : S.detail.back;

  return (
    <Box sx={styles.root}>
      <Box component="svg" viewBox="0 0 100 200" role="img" aria-label={S.detail.diagramLabel(label)} sx={styles.svg}>
        {shapes.map(({ muscle, svgPoints }) => {
          const level = levels.get(muscle) ?? 0;
          const fill = level > 0 ? colors[level - 1] : bodyColor;
          const isMuscle = !NON_MUSCLE_AREAS.has(muscle);
          const active = hovered === muscle;
          const polygons = svgPoints.map((points) => (
            <polygon
              key={points}
              points={points}
              fill={fill}
              stroke={active ? theme.palette.text.primary : 'none'}
              strokeWidth={active ? 0.8 : 0}
              strokeLinejoin="round"
              style={styles.polygon(isMuscle)}
              opacity={hovered && !active && isMuscle ? 0.75 : 1}
              onMouseEnter={isMuscle ? () => setHovered(muscle) : undefined}
              onMouseLeave={isMuscle ? () => setHovered(null) : undefined}
            />
          ));
          if (!isMuscle) return <g key={muscle}>{polygons}</g>;
          return (
            <Tooltip
              key={muscle}
              title={S.detail.areaTooltip(S.areas[muscle as keyof typeof S.areas], S.detail.roles[level])}
              followCursor
              enterTouchDelay={0}
              leaveTouchDelay={2500}
            >
              <g>{polygons}</g>
            </Tooltip>
          );
        })}
      </Box>
      <Typography variant="caption" color="text.secondary" sx={styles.label}>
        {label}
      </Typography>
    </Box>
  );
}
