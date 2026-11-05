import { Stack, TextField, Typography } from '@mui/material';
import { StepHeader } from './StepHeader';
import { ChoiceChips } from './ChoiceChips';
import { MEALS_PER_DAY_OPTIONS, ONBOARDING_STRINGS, WORK_SCHEDULE_OPTIONS } from '../../constants/onboarding';
import type { Lifestyle, StepProps, WorkSchedule } from '../../types/onboarding';
import { toNumberOrEmpty } from '../../utils/onboarding';
import { stepRoutineStyles as styles } from './StepRoutine.styles';

const S = ONBOARDING_STRINGS.steps.routine;

/** Sleep, work pattern and meal rhythm, used to time meals and workouts sensibly. */
export function StepRoutine({ data, onChange }: StepProps) {
  const lifestyle = data.lifestyle;

  function update(patch: Partial<Lifestyle>) {
    onChange({ lifestyle: { ...lifestyle, ...patch } });
  }

  const water = lifestyle.water_glasses_per_day ?? '';

  return (
    <Stack spacing={2.5}>
      <StepHeader title={S.title} />
      <Typography variant="body2" color="text.secondary">
        {ONBOARDING_STRINGS.optionalHint}
      </Typography>
      <Stack sx={styles.timeRow}>
        <TextField
          type="time"
          label={S.wake}
          value={lifestyle.wake_time ?? ''}
          onChange={(e) => update({ wake_time: e.target.value || undefined })}
          slotProps={{ inputLabel: { shrink: true } }}
          fullWidth
        />
        <TextField
          type="time"
          label={S.sleep}
          value={lifestyle.sleep_time ?? ''}
          onChange={(e) => update({ sleep_time: e.target.value || undefined })}
          slotProps={{ inputLabel: { shrink: true } }}
          fullWidth
        />
      </Stack>
      <ChoiceChips<WorkSchedule>
        label={S.workSchedule}
        options={WORK_SCHEDULE_OPTIONS}
        value={lifestyle.work_schedule}
        onChange={(work_schedule) => update({ work_schedule })}
      />
      <ChoiceChips<number>
        label={S.mealsPerDay}
        options={MEALS_PER_DAY_OPTIONS}
        value={lifestyle.meals_per_day}
        onChange={(meals_per_day) => update({ meals_per_day })}
      />
      <TextField
        type="number"
        label={S.water}
        value={water}
        onChange={(e) => {
          const value = toNumberOrEmpty(e.target.value);
          update({ water_glasses_per_day: value === '' ? undefined : value });
        }}
        slotProps={{ htmlInput: { min: 0, max: 30 } }}
      />
    </Stack>
  );
}
