import type { ComponentType } from 'react';
import { Box, ButtonBase, Chip, Skeleton, Stack, Typography, type SvgIconProps } from '@mui/material';
import {
  AccessibilityNewRounded,
  AirlineSeatReclineNormalRounded,
  BackHandRounded,
  SelfImprovementRounded,
} from '@mui/icons-material';
import { useSearchParams } from 'react-router-dom';
import { ACTIVITY_STRINGS } from '../../constants/activityStrings';
import { ROUTINE_QUERY_PARAM } from '../../constants/activity';
import { useDeskRoutines } from '../../hooks/queries/useActivityQueries';
import { queryErrorMessage } from '../../hooks/queries/queryHelpers';
import type { DeskRoutine, DeskRoutineFocus } from '../../types/activity';
import { ErrorState } from '../ui/ErrorState';
import { IconBadge } from '../ui/IconBadge';
import { Reveal } from '../ui/Reveal';
import { SectionCard } from '../ui/SectionCard';
import { DeskRoutinePlayer } from './DeskRoutinePlayer';
import { deskRoutinesStyles as styles } from './DeskRoutines.styles';

const S = ACTIVITY_STRINGS.routines;

const FOCUS_ICONS: Record<DeskRoutineFocus, ComponentType<SvgIconProps>> = {
  wrists: BackHandRounded,
  neck: SelfImprovementRounded,
  hips: AirlineSeatReclineNormalRounded,
  full_body: AccessibilityNewRounded,
};

/**
 * The desk routines as cards; choosing one opens the guided player. A
 * `?routine=<id>` link (from a break reminder) opens that routine directly.
 */
export function DeskRoutines() {
  const routines = useDeskRoutines();
  const [params, setParams] = useSearchParams();
  const openId = params.get(ROUTINE_QUERY_PARAM);
  const open: DeskRoutine | null = routines.data?.find((r) => r.id === openId) ?? null;

  function setOpen(id: string | null) {
    const next = new URLSearchParams(params);
    if (id) next.set(ROUTINE_QUERY_PARAM, id);
    else next.delete(ROUTINE_QUERY_PARAM);
    setParams(next, { replace: true });
  }

  const error = queryErrorMessage(routines.error, S.loadError);

  return (
    <SectionCard title={S.title} subtitle={S.subtitle}>
      {error && !routines.data ? (
        <ErrorState message={error} onRetry={() => routines.refetch()} />
      ) : !routines.data ? (
        <Box sx={styles.grid}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} variant="rounded" height={112} />
          ))}
        </Box>
      ) : (
        <Box sx={styles.grid}>
          {routines.data.map((routine, index) => {
            const Icon = FOCUS_ICONS[routine.focus] ?? SelfImprovementRounded;
            return (
              <Reveal key={routine.id} index={index} fill>
                <ButtonBase sx={styles.card} onClick={() => setOpen(routine.id)} focusRipple>
                  <Stack sx={styles.cardHeader}>
                    <IconBadge icon={Icon} tone="secondary" />
                    <Chip size="small" label={S.minutes(routine.minutes)} />
                  </Stack>
                  <Typography variant="subtitle1" component="h3" sx={styles.name}>
                    {routine.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {routine.description}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={styles.meta}>
                    {S.moves(routine.steps.length)}
                    {routine.skipped_for_injury > 0 && ` · ${S.skipped(routine.skipped_for_injury)}`}
                  </Typography>
                </ButtonBase>
              </Reveal>
            );
          })}
        </Box>
      )}

      {open && <DeskRoutinePlayer key={open.id} routine={open} onClose={() => setOpen(null)} />}
    </SectionCard>
  );
}
