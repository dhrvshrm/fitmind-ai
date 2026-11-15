import { Box, ButtonBase, Stack, Typography } from "@mui/material";
import {
  DirectionsRunRounded,
  LocalFireDepartmentRounded,
  SelfImprovementRounded,
  TrendingUpRounded,
  type SvgIconComponent,
} from "@mui/icons-material";
import type { ReactNode } from "react";
import { STRINGS } from "../../constants/strings";
import type { WarmUp, WarmUpMove } from "../../types/workout";
import { warmUpListStyles as styles } from "./WarmUpList.styles";

const S = STRINGS.workout.warmUp;

type WarmUpListProps = {
  warmUp: WarmUp;
  /** Opens how to do a move. */
  onDetails?: (exerciseId: string) => void;
};

type PhaseProps = {
  number: number;
  icon: SvgIconComponent;
  title: string;
  hint: string;
  children: ReactNode;
};

/** One numbered phase of the warm-up. */
function Phase({ number, icon: Icon, title, hint, children }: PhaseProps) {
  return (
    <Box component="li" sx={styles.phase}>
      <Stack sx={styles.phaseHead}>
        <Box sx={styles.phaseNumber}>{number}</Box>
        <Icon fontSize="small" sx={styles.phaseIcon} />
        <Box>
          <Typography variant="body2" sx={styles.phaseTitle}>
            {title}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {hint}
          </Typography>
        </Box>
      </Stack>
      {children}
    </Box>
  );
}

/**
 * The day's warm-up in three phases: an easy pulse raiser, mobility and
 * activation for the muscles trained today, then lighter sets of the first lift.
 */
export function WarmUpList({ warmUp, onDetails }: WarmUpListProps) {
  const moves = (list: WarmUpMove[]) => (
    <Box component="ul" sx={styles.moves}>
      {list.map((move) => {
        const id = move.exercise_id;
        return (
          <Box component="li" key={id ?? move.name}>
            <ButtonBase
              sx={styles.move}
              disabled={!onDetails || !id}
              onClick={() => id && onDetails?.(id)}
              aria-label={S.detailsAria(move.name)}
            >
              {move.image && (
                <Box
                  component="img"
                  src={move.image}
                  alt=""
                  loading="lazy"
                  sx={styles.thumb}
                />
              )}
              <Box sx={styles.moveText}>
                <Typography variant="body2" sx={styles.moveName}>
                  {move.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {move.dose}
                </Typography>
              </Box>
            </ButtonBase>
          </Box>
        );
      })}
    </Box>
  );

  const phases = [
    warmUp.pulse.length > 0 && {
      icon: DirectionsRunRounded,
      ...S.phases.pulse,
      body: moves(warmUp.pulse),
    },
    warmUp.mobility.length > 0 && {
      icon: SelfImprovementRounded,
      ...S.phases.mobility,
      body: moves(warmUp.mobility),
    },
    warmUp.ramp_up && {
      icon: TrendingUpRounded,
      ...S.phases.rampUp,
      body: (
        <Typography variant="body2" sx={styles.rampText}>
          {S.rampUp(warmUp.ramp_up.name, warmUp.ramp_up.sets)}
        </Typography>
      ),
    },
  ].filter((phase) => phase !== false && phase !== null);

  return (
    <Box sx={styles.root}>
      <Stack sx={styles.header}>
        <LocalFireDepartmentRounded fontSize="small" sx={styles.headerIcon} />
        <Box>
          <Typography variant="subtitle2">{S.title(warmUp.minutes)}</Typography>
          <Typography variant="caption" color="text.secondary">
            {S.subtitle}
          </Typography>
        </Box>
      </Stack>
      <Box component="ol" sx={styles.phases}>
        {phases.map((phase, index) => (
          <Phase
            key={phase.title}
            number={index + 1}
            icon={phase.icon}
            title={phase.title}
            hint={phase.hint}
          >
            {phase.body}
          </Phase>
        ))}
      </Box>
    </Box>
  );
}
