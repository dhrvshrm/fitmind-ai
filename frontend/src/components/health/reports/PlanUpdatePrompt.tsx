import { useState } from 'react';
import { Box, Button, CircularProgress, Stack, Typography } from '@mui/material';
import { CheckRounded, FitnessCenterRounded, RestaurantMenuRounded, UpdateRounded } from '@mui/icons-material';
import toast from 'react-hot-toast';
import { LAB_REPORT_STRINGS } from '../../../constants/labReportStrings';
import { useCreateDietPlan } from '../../../hooks/queries/useDietPlanQueries';
import { useGeneratePlan } from '../../../hooks/queries/useWorkoutQueries';
import { resolveApiError } from '../../../lib/apiClient';
import type { ReportKind } from '../../../types/labReports';
import { planUpdatePromptStyles as styles } from './PlanUpdatePrompt.styles';

const S = LAB_REPORT_STRINGS.updatePrompt;

type PlanUpdatePromptProps = {
  kind: ReportKind;
  onDismiss: () => void;
};

/**
 * After results are saved: one tap to rebuild the plans around them. Plans
 * never change on their own (a promise on the landing page), so the person
 * decides, but it's right there.
 */
export function PlanUpdatePrompt({ kind, onDismiss }: PlanUpdatePromptProps) {
  const meals = useCreateDietPlan();
  const workouts = useGeneratePlan();
  const [done, setDone] = useState<{ meals: boolean; workouts: boolean }>({ meals: false, workouts: false });
  const scan = kind === 'body_composition';

  async function run(which: 'meals' | 'workouts') {
    try {
      if (which === 'meals') await meals.mutateAsync();
      else await workouts.mutateAsync({});
      setDone((d) => ({ ...d, [which]: true }));
      toast.success(which === 'meals' ? S.mealsDone : S.workoutsDone);
    } catch (err) {
      toast.error(resolveApiError(err, S.error));
    }
  }

  return (
    <Box sx={styles.root} role="status">
      <UpdateRounded sx={styles.icon} />
      <Box sx={styles.body}>
        <Typography variant="subtitle2">{S.title}</Typography>
        <Typography variant="body2" color="text.secondary">
          {scan ? S.body_composition : S.blood}
        </Typography>
        <Stack sx={styles.actions}>
          {scan && (
            <Button
              variant="contained"
              size="small"
              disabled={workouts.isPending || done.workouts}
              onClick={() => run('workouts')}
              startIcon={
                workouts.isPending ? (
                  <CircularProgress size={14} color="inherit" />
                ) : done.workouts ? (
                  <CheckRounded />
                ) : (
                  <FitnessCenterRounded />
                )
              }
            >
              {done.workouts ? S.updated : S.updateWorkouts}
            </Button>
          )}
          <Button
            variant={scan ? 'outlined' : 'contained'}
            size="small"
            disabled={meals.isPending || done.meals}
            onClick={() => run('meals')}
            startIcon={
              meals.isPending ? (
                <CircularProgress size={14} color="inherit" />
              ) : done.meals ? (
                <CheckRounded />
              ) : (
                <RestaurantMenuRounded />
              )
            }
          >
            {done.meals ? S.updated : S.updateMeals}
          </Button>
          <Button size="small" color="inherit" onClick={onDismiss}>
            {S.dismiss}
          </Button>
        </Stack>
        <Typography variant="caption" color="text.secondary">
          {S.note}
        </Typography>
      </Box>
    </Box>
  );
}
