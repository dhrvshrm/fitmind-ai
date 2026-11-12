import { useMemo, useState, type ComponentType } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  LinearProgress,
  Stack,
  Typography,
} from '@mui/material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Step1Personal } from './Step1Personal';
import { Step2Goal } from './Step2Goal';
import { StepActivity } from './StepActivity';
import { StepTraining } from './StepTraining';
import { StepFood } from './StepFood';
import { StepAccess } from './StepAccess';
import { StepRoutine } from './StepRoutine';
import { StepTargets } from './StepTargets';
import { useCompleteOnboarding, useUserProfile } from '../../hooks/queries/useProfileQueries';
import { useCompleteOnboardingWithSetup } from '../../hooks/queries/useHabitQueries';
import { resolveApiError } from '../../lib/apiClient';
import { ROUTES } from '../../constants/routes';
import { INITIAL_ONBOARDING_DATA, ONBOARDING_STRINGS } from '../../constants/onboarding';
import {
  FIRST_OPTIONAL_STEP,
  TARGETS_STEP,
  profileToOnboardingData,
  stepValidators,
  toOnboardingPayload,
} from '../../utils/onboarding';
import { PageLoader } from '../ui/PageLoader';
import { onboardingFlowStyles as styles } from './OnboardingFlow.styles';
import type { OnboardingData, OnboardingErrors, StepProps } from '../../types/onboarding';

/** Step components in display order; index lines up with `stepValidators`. */
const STEPS: ComponentType<StepProps>[] = [
  Step1Personal,
  Step2Goal,
  StepActivity,
  StepTraining,
  StepFood,
  StepAccess,
  StepRoutine,
  StepTargets,
];

const TOTAL = STEPS.length;
const A = ONBOARDING_STRINGS.actions;

/**
 * Onboarding in short groups of questions. With `?mode=update` it opens
 * prefilled from the saved profile so answers can be completed or changed later.
 */
export function OnboardingFlow() {
  const [params] = useSearchParams();
  const isUpdate = params.get('mode') === 'update';
  const profile = useUserProfile();

  if (isUpdate && profile.isPending) return <PageLoader />;
  const initial =
    isUpdate && profile.data ? profileToOnboardingData(profile.data) : INITIAL_ONBOARDING_DATA;
  return <OnboardingSteps initial={initial} isUpdate={isUpdate} />;
}

type OnboardingStepsProps = {
  initial: OnboardingData;
  isUpdate: boolean;
};

function OnboardingSteps({ initial, isUpdate }: OnboardingStepsProps) {
  const navigate = useNavigate();
  const completeOnboarding = useCompleteOnboarding();
  const onboardWithSetup = useCompleteOnboardingWithSetup();

  const [stepIndex, setStepIndex] = useState(0);
  const [data, setData] = useState<OnboardingData>(initial);
  const [errors, setErrors] = useState<OnboardingErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const isSubmitting = completeOnboarding.isPending || onboardWithSetup.isPending;
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === TOTAL - 1;
  const isOptional = stepIndex >= FIRST_OPTIONAL_STEP && stepIndex < TARGETS_STEP;
  const StepComponent = STEPS[stepIndex];
  const progress = useMemo(() => ((stepIndex + 1) / TOTAL) * 100, [stepIndex]);

  /** Merge a field patch and clear any errors for the touched fields. */
  function handleChange(patch: Partial<OnboardingData>) {
    setData((prev) => ({ ...prev, ...patch }));
    setErrors((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(patch)) delete next[key as keyof OnboardingData];
      return next;
    });
  }

  /** Validate the current step; returns true when it's clear to advance. */
  function validateCurrent(): boolean {
    const stepErrors = stepValidators[stepIndex](data);
    setErrors(stepErrors);
    return Object.keys(stepErrors).length === 0;
  }

  function handleBack() {
    setSubmitError(null);
    setStepIndex((i) => Math.max(0, i - 1));
  }

  async function handleNext() {
    if (!validateCurrent()) return;
    if (!isLast) {
      setStepIndex((i) => i + 1);
      return;
    }
    await handleSubmit();
  }

  async function handleSubmit() {
    setSubmitError(null);
    try {
      if (isUpdate) {
        await completeOnboarding.mutateAsync(toOnboardingPayload(data));
        toast.success(ONBOARDING_STRINGS.updated);
        navigate(ROUTES.PROFILE, { replace: true });
        return;
      }
      // First time: the meal and workout plans are built straight away, then Today opens.
      const result = await onboardWithSetup.mutateAsync(toOnboardingPayload(data));
      toast.success(ONBOARDING_STRINGS.success);
      navigate(ROUTES.TODAY, { replace: true, state: { setup: result.setup } });
    } catch (error) {
      setSubmitError(resolveApiError(error, ONBOARDING_STRINGS.error));
    }
  }

  return (
    <Box sx={styles.root}>
      <Card sx={styles.card}>
        <CardContent sx={styles.content}>
          <Stack sx={styles.header}>
            <Typography variant="overline" color="primary">
              {isUpdate ? ONBOARDING_STRINGS.updateTitle : ONBOARDING_STRINGS.title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {ONBOARDING_STRINGS.stepCounter(stepIndex + 1, TOTAL)}
            </Typography>
          </Stack>

          <LinearProgress
            variant="determinate"
            value={progress}
            aria-label={ONBOARDING_STRINGS.stepCounter(stepIndex + 1, TOTAL)}
            sx={styles.progress}
          />

          {submitError && (
            <Alert severity="error" sx={styles.alert}>
              {submitError}
            </Alert>
          )}

          <StepComponent data={data} errors={errors} onChange={handleChange} />

          <Stack sx={styles.actions}>
            <Button
              variant="outlined"
              onClick={handleBack}
              disabled={isFirst || isSubmitting}
              fullWidth
            >
              {A.back}
            </Button>
            <Button
              variant="contained"
              onClick={handleNext}
              disabled={isSubmitting}
              fullWidth
              startIcon={isSubmitting ? <CircularProgress size={18} color="inherit" /> : null}
            >
              {isLast
                ? isSubmitting
                  ? A.submitting
                  : isUpdate
                    ? A.update
                    : A.submit
                : A.next}
            </Button>
          </Stack>
          {isOptional && (
            <Button color="inherit" onClick={() => setStepIndex(TARGETS_STEP)} sx={styles.skip}>
              {A.skip}
            </Button>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
