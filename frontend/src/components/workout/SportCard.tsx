import { useState } from 'react';
import { Box, Button, MenuItem, TextField, Typography } from '@mui/material';
import toast from 'react-hot-toast';
import {
  NO_MATCH_DAY,
  NO_SPORT,
  SPORT_PHASES,
  SPORT_STRINGS,
  SPORTS,
  WEEKDAYS,
} from '../../constants/sportStrings';
import { useUserProfile } from '../../hooks/queries/useProfileQueries';
import { useUpdateSport } from '../../hooks/queries/useWorkoutQueries';
import { resolveApiError } from '../../lib/apiClient';
import type { SportKey, SportPhase } from '../../types/sport';
import { SectionCard } from '../ui/SectionCard';
import { sportCardStyles as styles } from './SportCard.styles';

const S = SPORT_STRINGS.card;

type Draft = { sport: SportKey | typeof NO_SPORT; phase: SportPhase; matchDay: number };

/** Pick a sport, season phase and match day; the next plan trains for it. */
export function SportCard() {
  const profile = useUserProfile();
  const update = useUpdateSport();
  const saved = profile.data?.sport;
  const initial: Draft = {
    sport: (saved?.sport as SportKey | undefined) ?? NO_SPORT,
    phase: saved?.phase ?? 'off_season',
    matchDay: saved?.match_day ?? NO_MATCH_DAY,
  };
  const [draft, setDraft] = useState<Draft | null>(null);
  const current = draft ?? initial;
  const playing = current.sport !== NO_SPORT;

  async function handleSave() {
    try {
      await update.mutateAsync({
        sport: current.sport,
        ...(playing ? { phase: current.phase, match_day: current.matchDay } : {}),
      });
      toast.success(S.saved);
      setDraft(null);
    } catch (err) {
      toast.error(resolveApiError(err, S.error));
    }
  }

  if (!profile.data) return null;

  return (
    <SectionCard title={S.title} subtitle={S.subtitle}>
      <Box sx={styles.fields}>
        <TextField
          select
          size="small"
          label={S.sport}
          value={current.sport}
          onChange={(e) => setDraft({ ...current, sport: e.target.value as Draft['sport'] })}
        >
          <MenuItem value={NO_SPORT}>{S.noSport}</MenuItem>
          {SPORTS.map((sport) => (
            <MenuItem key={sport} value={sport}>
              {SPORT_STRINGS.names[sport]}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label={S.phase}
          value={current.phase}
          disabled={!playing}
          helperText={playing ? SPORT_STRINGS.phaseHelp[current.phase] : undefined}
          onChange={(e) => setDraft({ ...current, phase: e.target.value as SportPhase })}
        >
          {SPORT_PHASES.map((phase) => (
            <MenuItem key={phase} value={phase}>
              {SPORT_STRINGS.phases[phase]}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label={S.matchDay}
          value={current.matchDay}
          disabled={!playing}
          onChange={(e) => setDraft({ ...current, matchDay: Number(e.target.value) })}
        >
          <MenuItem value={NO_MATCH_DAY}>{S.noMatchDay}</MenuItem>
          {WEEKDAYS.map((day, index) => (
            <MenuItem key={day} value={index}>
              {day}
            </MenuItem>
          ))}
        </TextField>
      </Box>
      <Box sx={styles.footer}>
        <Typography variant="caption" color="text.secondary">
          {playing ? SPORT_STRINGS.note : ''}
        </Typography>
        <Button variant="contained" onClick={handleSave} disabled={!draft || update.isPending}>
          {update.isPending ? S.saving : S.save}
        </Button>
      </Box>
    </SectionCard>
  );
}
