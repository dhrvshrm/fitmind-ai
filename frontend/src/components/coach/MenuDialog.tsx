import { useRef, useState, type ChangeEvent } from 'react';
import {
  Alert,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Stack,
  TextField,
} from '@mui/material';
import { AddPhotoAlternateRounded } from '@mui/icons-material';
import { COACH_STRINGS, MAX_MENU_PHOTO_BYTES } from '../../constants/coachStrings';
import { resolveApiError } from '../../lib/apiClient';
import type { MenuAdviceRequest } from '../../types/coach';
import { menuDialogStyles as styles } from './MenuDialog.styles';

const S = COACH_STRINGS.menu;

type MenuDialogProps = {
  open: boolean;
  loading: boolean;
  error: unknown;
  onSubmit: (request: MenuAdviceRequest) => void;
  onClose: () => void;
};

/** "What should I order?": paste or type a menu, or add a photo of it. */
export function MenuDialog({ open, loading, error, onSubmit, onClose }: MenuDialogProps) {
  const [text, setText] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    event.target.value = '';
    if (file && file.size > MAX_MENU_PHOTO_BYTES) {
      setLocalError(S.photoTooLarge);
      return;
    }
    setLocalError(null);
    setImage(file);
  }

  function handleSubmit() {
    if (!text.trim() && !image) {
      setLocalError(S.emptyError);
      return;
    }
    setLocalError(null);
    onSubmit({ text, image });
  }

  function handleClose() {
    if (loading) return;
    setLocalError(null);
    onClose();
  }

  const shownError = localError ?? (error ? resolveApiError(error, S.error) : null);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>{S.title}</DialogTitle>
      <DialogContent>
        <DialogContentText sx={styles.description}>{S.description}</DialogContentText>
        <TextField
          label={S.textLabel}
          placeholder={S.textPlaceholder}
          value={text}
          onChange={(e) => setText(e.target.value)}
          multiline
          minRows={5}
          maxRows={12}
          fullWidth
          disabled={loading}
          slotProps={{ htmlInput: { maxLength: 6000 } }}
        />
        <Stack sx={styles.photoRow}>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={handleFile} />
          <Button
            startIcon={<AddPhotoAlternateRounded />}
            onClick={() => fileRef.current?.click()}
            disabled={loading}
            size="small"
          >
            {S.addPhoto}
          </Button>
          {image && (
            <Chip
              label={image.name}
              onDelete={loading ? undefined : () => setImage(null)}
              aria-label={S.removePhoto}
              size="small"
              sx={styles.fileChip}
            />
          )}
        </Stack>
        {shownError && (
          <Alert severity="error" sx={styles.error}>
            {shownError}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          {S.cancel}
        </Button>
        <Button variant="contained" onClick={handleSubmit} disabled={loading}>
          {S.submit}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
