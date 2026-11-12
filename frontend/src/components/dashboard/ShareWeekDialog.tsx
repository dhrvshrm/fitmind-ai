import { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Skeleton,
  Stack,
  Typography,
  useTheme,
} from '@mui/material';
import { DownloadRounded, IosShareRounded } from '@mui/icons-material';
import toast from 'react-hot-toast';
import { PROGRESS_STRINGS } from '../../constants/progressStrings';
import { STRINGS } from '../../constants/strings';
import { useWeekSummary } from '../../hooks/queries/useProgressQueries';
import { FONTS } from '../../theme';
import type { WeekStats } from '../../types/progress';
import { formatDateLabel } from '../../utils/date';
import { canShareFiles, canvasToBlob, downloadBlob, drawShareCard, shareImage } from '../../utils/shareCard';
import { shareWeekDialogStyles as styles } from './ShareWeekDialog.styles';

const S = PROGRESS_STRINGS.share;
const C = S.card;

type OptionKey = 'consistency' | 'workouts' | 'direction' | 'streak' | 'meals' | 'weightRate' | 'calories' | 'protein';

/** Everyday options are on by default; health details stay off until the user turns them on. */
const EVERYDAY: OptionKey[] = ['consistency', 'workouts', 'direction', 'streak', 'meals'];
const HEALTH: OptionKey[] = ['weightRate', 'calories', 'protein'];
const DEFAULT_ON: OptionKey[] = ['consistency', 'workouts', 'direction'];

function lineFor(key: OptionKey, stats: WeekStats): string | null {
  switch (key) {
    case 'consistency':
      return C.consistency(stats.active_days);
    case 'workouts':
      return C.workouts(stats.workouts_done, stats.workouts_planned);
    case 'direction':
      return stats.weight_direction ? PROGRESS_STRINGS.direction[stats.weight_direction] : null;
    case 'streak':
      return stats.streak ? C.streak(stats.streak) : null;
    case 'meals':
      return C.meals(stats.meal_days);
    case 'weightRate':
      return stats.weight_weekly_rate === null ? null : C.weightRate(stats.weight_weekly_rate);
    case 'calories':
      return stats.average_calories === null ? null : C.calories(stats.average_calories);
    case 'protein':
      return stats.protein_target ? C.protein(stats.protein_days) : null;
    default:
      return null;
  }
}

type ShareWeekDialogProps = {
  open: boolean;
  onClose: () => void;
};

/** Builds an image of the week in the browser; the user picks every line that goes on it. */
export function ShareWeekDialog({ open, onClose }: ShareWeekDialogProps) {
  const theme = useTheme();
  const summary = useWeekSummary();
  const [chosen, setChosen] = useState<OptionKey[]>(DEFAULT_ON);
  const [busy, setBusy] = useState(false);
  const stats = summary.data;
  const shareable = canShareFiles();

  const canvas = useMemo(() => {
    if (!stats) return null;
    const lines = [...EVERYDAY, ...HEALTH]
      .filter((key) => chosen.includes(key))
      .map((key) => lineFor(key, stats))
      .filter((line): line is string => Boolean(line));
    return drawShareCard(
      {
        brand: C.brand,
        heading: C.heading,
        range: C.range(formatDateLabel(stats.start), formatDateLabel(stats.end)),
        lines,
        footer: C.footer,
        fontFamily: FONTS.display,
      },
      {
        start: theme.palette.primary.dark,
        end: theme.palette.secondary.dark,
        text: '#ffffff',
        muted: 'rgba(255, 255, 255, 0.78)',
        accent: theme.palette.secondary.light,
      },
    );
  }, [stats, chosen, theme]);
  const preview = useMemo(() => canvas?.toDataURL('image/png') ?? null, [canvas]);

  function toggle(key: OptionKey) {
    setChosen((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }

  async function withBlob(action: (blob: Blob) => Promise<void>) {
    if (!canvas) return;
    setBusy(true);
    try {
      const blob = await canvasToBlob(canvas);
      if (!blob) throw new Error('empty image');
      await action(blob);
    } catch (err) {
      // A cancelled share sheet is not an error worth showing.
      if (!(err instanceof DOMException && err.name === 'AbortError')) toast.error(S.error);
    } finally {
      setBusy(false);
    }
  }

  const download = () =>
    withBlob(async (blob) => {
      downloadBlob(blob, S.fileName);
      toast.success(S.downloaded);
    });

  const share = () =>
    withBlob(async (blob) => {
      if (await shareImage(blob, S.fileName, C.heading)) toast.success(S.shared);
      else downloadBlob(blob, S.fileName);
    });

  const renderOption = (key: OptionKey) => (
    <FormControlLabel
      key={key}
      control={<Checkbox size="small" checked={chosen.includes(key)} onChange={() => toggle(key)} />}
      label={<Typography variant="body2">{S.options[key]}</Typography>}
    />
  );

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} maxWidth="md" fullWidth>
      <DialogTitle>{S.title}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={styles.subtitle}>
          {S.subtitle}
        </Typography>
        <Box sx={styles.layout}>
          <Box sx={styles.previewWrap}>
            {preview ? (
              <Box component="img" src={preview} alt={S.title} sx={styles.preview} />
            ) : (
              <Skeleton variant="rounded" sx={styles.previewSkeleton} />
            )}
          </Box>
          <Stack sx={styles.options}>
            <Typography variant="overline" color="text.secondary">
              {S.include}
            </Typography>
            {EVERYDAY.map(renderOption)}
            <Typography variant="overline" color="text.secondary" sx={styles.healthLabel}>
              {S.healthNote}
            </Typography>
            {HEALTH.map(renderOption)}
          </Stack>
        </Box>
      </DialogContent>
      <DialogActions sx={styles.actions}>
        <Button onClick={onClose} disabled={busy} color="inherit">
          {STRINGS.ui.cancel}
        </Button>
        <Button onClick={download} disabled={busy || !canvas} startIcon={<DownloadRounded />}>
          {S.download}
        </Button>
        {shareable && (
          <Button variant="contained" onClick={share} disabled={busy || !canvas} startIcon={<IosShareRounded />}>
            {S.shareButton}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
