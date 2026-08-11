import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  FormControlLabel,
  Paper,
  Skeleton,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { settingsService } from "../../services/settingsService";
import { useAuth } from "../../hooks/useAuth";
import { resolveApiError } from "../../lib/apiClient";
import { STRINGS } from "../../constants/strings";
import { ROUTES } from "../../constants/routes";
import type {
  NotificationPreferenceKey,
  NotificationPreferences,
} from "../../types/settings";
import { ChangePasswordForm } from "./ChangePasswordForm";
import { settingsPageStyles as styles } from "./SettingsPage.styles";

const S = STRINGS.settings;

/** Order the notification toggles are displayed in. */
const PREFERENCE_KEYS: NotificationPreferenceKey[] = [
  "follow",
  "friend_request",
  "nudge",
  "weekly_report",
  "badge_earned",
  "streak_warning",
];

/** Settings: notification toggles, change password, and account deletion. */
export function SettingsPage() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [prefsError, setPrefsError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let active = true;
    settingsService
      .getNotificationPreferences()
      .then((data) => {
        if (active) setPrefs(data);
      })
      .catch((err: unknown) => {
        if (active) setPrefsError(resolveApiError(err, S.notifications.loadError));
      });
    return () => {
      active = false;
    };
  }, []);

  async function handleToggle(key: NotificationPreferenceKey, value: boolean) {
    if (!prefs) return;
    const previous = prefs;
    setPrefs({ ...prefs, [key]: value }); // optimistic
    try {
      await settingsService.updateNotificationPreferences({ [key]: value });
      toast.success(S.notifications.saved);
    } catch (error) {
      setPrefs(previous); // revert
      toast.error(resolveApiError(error, S.notifications.error));
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await settingsService.deleteAccount();
      toast.success(S.danger.deleted);
      logout();
      navigate(ROUTES.LOGIN, { replace: true });
    } catch (error) {
      toast.error(resolveApiError(error, S.danger.error));
      setDeleting(false);
    }
  }

  return (
    <Box sx={styles.root}>
      <Box>
        <Typography variant="h4" sx={styles.header}>
          {S.title}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={styles.subtitle}>
          {S.subtitle}
        </Typography>
      </Box>

      {/* Notifications */}
      <Paper elevation={0} variant="outlined" sx={styles.card}>
        <Typography variant="h6" sx={styles.sectionTitle}>
          {S.notifications.title}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={styles.sectionSubtitle}>
          {S.notifications.subtitle}
        </Typography>

        {prefsError && <Alert severity="error">{prefsError}</Alert>}

        {!prefs && !prefsError && (
          <Skeleton variant="rounded" height={220} sx={{ borderRadius: 2 }} />
        )}

        {prefs && (
          <Box>
            {PREFERENCE_KEYS.map((key) => (
              <Box key={key} sx={styles.toggleRow}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={prefs[key]}
                      onChange={(e) => handleToggle(key, e.target.checked)}
                    />
                  }
                  label={S.notifications.labels[key]}
                />
              </Box>
            ))}
          </Box>
        )}
      </Paper>

      {/* Change password */}
      <Paper elevation={0} variant="outlined" sx={styles.card}>
        <Typography variant="h6" sx={styles.sectionTitle}>
          {S.password.title}
        </Typography>
        <Divider sx={{ my: 1.5 }} />
        <ChangePasswordForm />
      </Paper>

      {/* Danger zone */}
      <Paper elevation={0} variant="outlined" sx={styles.dangerCard}>
        <Typography variant="h6" sx={styles.dangerTitle}>
          {S.danger.title}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={styles.dangerBody}>
          {S.danger.description}
        </Typography>
        <Button color="error" variant="outlined" onClick={() => setConfirmOpen(true)}>
          {S.danger.deleteButton}
        </Button>
      </Paper>

      {/* Delete confirmation */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>{S.danger.confirmTitle}</DialogTitle>
        <DialogContent>
          <DialogContentText>{S.danger.confirmBody}</DialogContentText>
          <TextField
            label={S.danger.confirmLabel}
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            sx={styles.confirmField}
            fullWidth
            autoFocus
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>{S.danger.cancel}</Button>
          <Button
            color="error"
            variant="contained"
            disabled={confirmText !== S.danger.confirmKeyword || deleting}
            onClick={handleDelete}
          >
            {S.danger.confirmButton}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
