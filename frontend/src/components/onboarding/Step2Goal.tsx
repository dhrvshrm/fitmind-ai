import { FormHelperText, Stack, TextField } from '@mui/material';
import { StepHeader } from './StepHeader';
import { OptionSelector } from './OptionSelector';
import { ChoiceChips } from './ChoiceChips';
import { GOAL_OPTIONS, GOALS_WITH_PACE, ONBOARDING_STRINGS, PACE_OPTIONS } from '../../constants/onboarding';
import { toNumberOrEmpty } from '../../utils/onboarding';
import type { FitnessGoal, GoalPace, StepProps } from '../../types/onboarding';

const S = ONBOARDING_STRINGS.steps.goal;

export function Step2Goal({ data, errors, onChange }: StepProps) {
  const goal = data.fitness_goal;
  const showPace = goal !== '' && GOALS_WITH_PACE.includes(goal);

  return (
    <Stack spacing={2.5}>
      <StepHeader title={S.title} helper={S.helper} />
      <OptionSelector<FitnessGoal>
        options={GOAL_OPTIONS}
        value={goal}
        onChange={(fitness_goal) =>
          // Pace and target weight only mean something for fat loss or muscle gain.
          onChange(
            GOALS_WITH_PACE.includes(fitness_goal)
              ? { fitness_goal }
              : { fitness_goal, goal_pace: '', target_weight_kg: '' },
          )
        }
      />
      {errors.fitness_goal && <FormHelperText error>{errors.fitness_goal}</FormHelperText>}

      {showPace && (
        <>
          <ChoiceChips<GoalPace>
            label={S.pace}
            options={PACE_OPTIONS[goal as 'fat_loss' | 'muscle_gain']}
            value={data.goal_pace}
            onChange={(value) => onChange({ goal_pace: value ?? '' })}
          />
          <TextField
            label={S.targetWeight}
            type="number"
            value={data.target_weight_kg}
            onChange={(e) => onChange({ target_weight_kg: toNumberOrEmpty(e.target.value) })}
            error={Boolean(errors.target_weight_kg)}
            helperText={errors.target_weight_kg}
            slotProps={{ htmlInput: { min: 30, max: 300, step: 0.5 } }}
          />
        </>
      )}
    </Stack>
  );
}
