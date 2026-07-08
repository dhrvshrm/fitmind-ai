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
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Step1Personal } from './Step1Personal';
import { Step2Goal } from './Step2Goal';
import { Step3Experience } from './Step3Experience';
import { Step4Equipment } from './Step4Equipment';
import { Step5Injuries } from './Step5Injuries';
import { userService } from '../../services/userService';
import { resolveApiError } from '../../lib/apiClient';
import { ROUTES } from '../../constants/routes';
import { INITIAL_ONBOARDING_DATA, ONBOARDING_STRINGS } from '../../constants/onboarding';
import { stepValidators, toOnboardingPayload } from '../../utils/onboarding';
import { onboardingFlowStyles as styles } from './OnboardingFlow.styles';
import type {
  OnboardingData,
  OnboardingErrors,
  StepProps,
} from '../../types/onboarding';

/** Step components in display order; index lines up with `stepValidators`. */
const STEPS: ComponentType<StepProps>[] = [
  Step1Personal,
  Step2Goal,
  Step3Experience,
  Step4Equipment,
  Step5Injuries,
];

const TOTAL = STEPS.length;
const A = ONBOARDING_STRINGS.actions;

export function OnboardingFlow() {
  const navigate = useNavigate();

  const [stepIndex, setStepIndex] = useState(0);
  const [data, setData] = useState<OnboardingData>(INITIAL_ONBOARDING_DATA);
  const [errors, setErrors] = useState<OnboardingErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isFirst = stepIndex === 0;
  const isLast = stepIndex === TOTAL - 1;
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
    setIsSubmitting(true);
    try {
      await userService.completeOnboarding(toOnboardingPayload(data));
      toast.success(ONBOARDING_STRINGS.success);
      navigate(ROUTES.DASHBOARD, { replace: true });
    } catch (error) {
      setSubmitError(resolveApiError(error, ONBOARDING_STRINGS.error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Box sx={styles.root}>
      <Card elevation={8} sx={styles.card}>
        <CardContent sx={styles.content}>
          <Stack spacing={0.5} sx={styles.header}>
            <Typography variant="overline" color="primary" sx={styles.brand}>
              {ONBOARDING_STRINGS.title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {ONBOARDING_STRINGS.stepCounter(stepIndex + 1, TOTAL)}
            </Typography>
          </Stack>

          <LinearProgress
            variant="determinate"
            value={progress}
            sx={styles.progress}
          />

          {submitError && (
            <Alert severity="error" sx={styles.alert}>
              {submitError}
            </Alert>
          )}

          <StepComponent data={data} errors={errors} onChange={handleChange} />

          <Stack direction="row" spacing={2} sx={styles.actions}>
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
              startIcon={
                isSubmitting ? <CircularProgress size={18} color="inherit" /> : null
              }
            >
              {isLast ? (isSubmitting ? A.submitting : A.submit) : A.next}
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
