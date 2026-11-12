import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { AddAPhotoRounded, AutoAwesomeRounded } from '@mui/icons-material';
import { ACTIVITY_STRINGS } from '../../constants/activityStrings';
import { PHOTO_MAX_BYTES } from '../../constants/activity';
import { usePhotoEstimate } from '../../hooks/queries/useActivityQueries';
import { resolveApiError } from '../../lib/apiClient';
import type { MealEstimate } from '../../types/nutrition';
import { shrinkPhoto } from '../../utils/foodScan';
import { photoLogDialogStyles as styles } from './PhotoLogDialog.styles';

const P = ACTIVITY_STRINGS.photo;

type PhotoLogDialogProps = {
  open: boolean;
  onClose: () => void;
  /** Called with the estimate for the normal review screen. */
  onEstimate: (estimate: MealEstimate) => void;
};

/**
 * Log a meal from a photo: the AI names the foods and rough portions, the
 * food database supplies the numbers, and the user checks everything on the
 * review screen before saving. The photo is not stored.
 */
export function PhotoLogDialog({ open, onClose, onEstimate }: PhotoLogDialogProps) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const inputRef = useRef<HTMLInputElement | null>(null);
  const estimate = usePhotoEstimate();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Release the preview's object URL when it changes or the dialog unmounts.
  useEffect(() => {
    if (!previewUrl) return undefined;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  function choose(next: File | undefined) {
    if (!next) return;
    if (!next.type.startsWith('image/')) {
      setError(P.notImage);
      return;
    }
    setError(null);
    setFile(next);
    setPreviewUrl(URL.createObjectURL(next));
  }

  function handleClose() {
    setFile(null);
    setPreviewUrl(null);
    setError(null);
    onClose();
  }

  async function analyse() {
    if (!file) return;
    setError(null);
    const { blob, filename } = await shrinkPhoto(file);
    if (blob.size > PHOTO_MAX_BYTES) {
      setError(P.tooLarge);
      return;
    }
    try {
      const result = await estimate.mutateAsync({ image: blob, filename });
      onEstimate(result);
      handleClose();
    } catch (err) {
      setError(resolveApiError(err, P.error));
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} fullScreen={fullScreen} fullWidth maxWidth="xs">
      <DialogTitle>{P.title}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={styles.hint}>
          {P.hint}
        </Typography>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={(e) => {
            choose(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
        {previewUrl ? (
          <Box component="img" src={previewUrl} alt={P.previewAlt} sx={styles.preview} />
        ) : (
          <Button
            variant="outlined"
            fullWidth
            startIcon={<AddAPhotoRounded />}
            onClick={() => inputRef.current?.click()}
            sx={styles.pick}
          >
            {P.choose}
          </Button>
        )}
        {previewUrl && (
          <Button size="small" onClick={() => inputRef.current?.click()} disabled={estimate.isPending} sx={styles.change}>
            {P.change}
          </Button>
        )}
        {error && (
          <Alert severity="warning" sx={styles.error}>
            {error}
          </Alert>
        )}
        <Typography variant="caption" color="text.secondary" component="p" sx={styles.privacy}>
          {P.privacy}
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>{P.close}</Button>
        <Button
          variant="contained"
          onClick={analyse}
          disabled={!file || estimate.isPending}
          startIcon={estimate.isPending ? <CircularProgress size={18} color="inherit" /> : <AutoAwesomeRounded />}
        >
          {estimate.isPending ? P.analysing : P.analyse}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
