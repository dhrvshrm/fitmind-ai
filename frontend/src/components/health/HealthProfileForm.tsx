import { useState } from 'react';
import { Box, Button, CircularProgress, Divider, Link, Stack, TextField, Typography } from '@mui/material';
import { SaveRounded } from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';
import toast from 'react-hot-toast';
import { CONDITION_ORDER, MEDICATIONS_MAX, OTHER_CONDITIONS_MAX } from '../../constants/health';
import { HEALTH_STRINGS } from '../../constants/healthStrings';
import { ROUTES } from '../../constants/routes';
import { useSaveHealthProfile } from '../../hooks/queries/useHealthQueries';
import { resolveApiError } from '../../lib/apiClient';
import type { ConditionDetails, ConditionKey, HealthDraft, HealthProfile } from '../../types/health';
import { draftFromProfile, payloadFromDraft, sameDraft } from '../../utils/health';
import { SectionCard } from '../ui/SectionCard';
import { ChoiceChips } from './ChoiceChips';
import { ConditionTile } from './ConditionTile';
import { healthProfileFormStyles as styles } from './HealthProfileForm.styles';

const P = HEALTH_STRINGS.profile;
const C = HEALTH_STRINGS.common;

type HealthProfileFormProps = {
  profile: HealthProfile | null;
};

/** The health questionnaire: conditions with follow-ups, medicines, blood thinners. */
export function HealthProfileForm({ profile }: HealthProfileFormProps) {
  const save = useSaveHealthProfile();
  const saved = draftFromProfile(profile);
  const [draft, setDraft] = useState<HealthDraft>(saved);
  const dirty = !sameDraft(draft, saved);
  const savedConditions = new Map((profile?.conditions ?? []).map((c) => [c.key, c]));

  function setCondition(key: ConditionKey, answers: ConditionDetails | undefined) {
    setDraft((current) => {
      const conditions = { ...current.conditions };
      if (answers === undefined) delete conditions[key];
      else conditions[key] = answers;
      return { ...current, conditions };
    });
  }

  async function handleSave() {
    try {
      const view = await save.mutateAsync(payloadFromDraft(draft));
      setDraft(draftFromProfile(view.profile));
      toast.success(P.saved);
    } catch (err) {
      toast.error(resolveApiError(err, P.error));
    }
  }

  return (
    <SectionCard title={P.title} subtitle={P.subtitle}>
      <Box role="group" aria-label={P.conditionsAria} sx={styles.conditions}>
        {CONDITION_ORDER.map((key) => (
          <ConditionTile
            key={key}
            condition={key}
            answers={draft.conditions[key]}
            saved={savedConditions.get(key)}
            onChange={(answers) => setCondition(key, answers)}
          />
        ))}
      </Box>

      <Divider sx={styles.divider} />

      <Typography variant="subtitle1" component="h3" sx={styles.subheading}>
        {P.medicinesTitle}
      </Typography>
      <Stack sx={styles.fields}>
        <TextField
          label={P.medicationsLabel}
          helperText={P.medicationsHelp}
          value={draft.medications}
          onChange={(e) => setDraft({ ...draft, medications: e.target.value })}
          multiline
          minRows={2}
          slotProps={{ htmlInput: { maxLength: MEDICATIONS_MAX } }}
        />
        <TextField
          label={P.otherLabel}
          helperText={P.otherHelp}
          value={draft.otherConditions}
          onChange={(e) => setDraft({ ...draft, otherConditions: e.target.value })}
          slotProps={{ htmlInput: { maxLength: OTHER_CONDITIONS_MAX } }}
        />
        <ChoiceChips
          label={P.bloodThinners}
          options={[
            { value: true, label: C.yes },
            { value: false, label: C.no },
          ]}
          value={draft.bloodThinners ?? undefined}
          onChange={(value) => setDraft({ ...draft, bloodThinners: value ?? null })}
        />
        <Typography variant="body2" color="text.secondary">
          {P.allergiesNote}{' '}
          <Link component={RouterLink} to={ROUTES.PROFILE} sx={styles.link}>
            {P.allergiesLink}
          </Link>
        </Typography>
      </Stack>

      <Box sx={styles.footer}>
        <Typography variant="body2" sx={styles.unsaved(dirty)} aria-live="polite">
          {dirty ? P.unsaved : ''}
        </Typography>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={!dirty || save.isPending}
          startIcon={save.isPending ? <CircularProgress size={16} color="inherit" /> : <SaveRounded />}
        >
          {save.isPending ? P.saving : P.save}
        </Button>
      </Box>
    </SectionCard>
  );
}
