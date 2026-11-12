import { useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControlLabel,
  Skeleton,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import {
  useDeleteAccount,
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from "../../hooks/queries/useProfileQueries";
import { queryErrorMessage } from "../../hooks/queries/queryHelpers";
import { resolveApiError } from "../../lib/apiClient";
import { STRINGS } from "../../constants/strings";
import { ROUTES } from "../../constants/routes";
import { COLOR_MODE_OPTIONS } from "../../constants/appearance";
import { usePreferencesStore, type ColorModePreference } from "../../store/preferencesStore";
import type { NotificationPreferenceKey } from "../../types/settings";
import { PageHeader } from "../ui/PageHeader";
import { SectionCard } from "../ui/SectionCard";
import { ErrorState } from "../ui/ErrorState";
import { ChangePasswordForm } from "./ChangePasswordForm";
import { ReminderSettings } from "./ReminderSettings";
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

/** Settings: appearance, notification toggles, change password, and account deletion. */
export function SettingsPage() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const colorMode = usePreferencesStore((s) => s.colorMode);
  const setColorMode = usePreferencesStore((s) => s.setColorMode);

  const prefsQuery = useNotificationPreferences();
  const updatePrefs = useUpdateNotificationPreferences();
  const deleteAccount = useDeleteAccount();

  const prefs = prefsQuery.data;
  const prefsError = queryErrorMessage(prefsQuery.error, S.notifications.loadError);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const deleting = deleteAccount.isPending;

  function handleColorMode(_event: unknown, value: ColorModePreference | null) {
    // Exclusive group: clicking the active option yields null; keep the current choice.
    if (value) setColorMode(value);
  }

  function handleToggle(key: NotificationPreferenceKey, value: boolean) {
    // Optimistic: the hook flips the cached value now and reverts on failure.
    updatePrefs.mutate(
      { [key]: value },
      {
        onSuccess: () => toast.success(S.notifications.saved),
        onError: (error) => toast.error(resolveApiError(error, S.notifications.error)),
      },
    );
  }

  async function handleDelete() {
    try {
      await deleteAccount.mutateAsync();
      toast.success(S.danger.deleted);
      logout();
      navigate(ROUTES.LOGIN, { replace: true });
    } catch (error) {
      toast.error(resolveApiError(error, S.danger.error));
    }
  }

  return (
    <Box sx={styles.root}>
      <PageHeader title={S.title} subtitle={S.subtitle} />

      {/* Appearance */}
      <SectionCard title={S.appearance.title} subtitle={S.appearance.subtitle}>
        <ToggleButtonGroup
          exclusive
          color="primary"
          size="small"
          value={colorMode}
          onChange={handleColorMode}
          aria-label={S.appearance.title}
          sx={styles.modeGroup}
        >
          {COLOR_MODE_OPTIONS.map((option) => {
            const Icon = option.icon;
            return (
              <ToggleButton key={option.value} value={option.value} sx={styles.modeButton}>
                <Icon fontSize="small" />
                {option.label}
              </ToggleButton>
            );
          })}
        </ToggleButtonGroup>
      </SectionCard>

      {/* Notifications */}
      <SectionCard title={S.notifications.title} subtitle={S.notifications.subtitle}>
        {prefsError && <ErrorState message={prefsError} onRetry={() => prefsQuery.refetch()} />}

        {prefsQuery.isPending && <Skeleton variant="rounded" sx={styles.prefsSkeleton} />}

        {prefs && (
          <Box sx={styles.toggleList}>
            {PREFERENCE_KEYS.map((key) => (
              <FormControlLabel
                key={key}
                control={
                  <Switch
                    checked={prefs[key]}
                    onChange={(e) => handleToggle(key, e.target.checked)}
                  />
                }
                label={S.notifications.labels[key]}
                labelPlacement="start"
                sx={styles.toggleRow}
              />
            ))}
          </Box>
        )}
      </SectionCard>

      {/* Push reminders (meals, workout, water, fresh start) */}
      <ReminderSettings />

      {/* Change password */}
      <SectionCard title={S.password.title} subtitle={S.password.subtitle}>
        <ChangePasswordForm />
      </SectionCard>

      {/* Danger zone */}
      <Box sx={styles.dangerWrap}>
        <SectionCard title={S.danger.title}>
          <Typography variant="body2" color="text.secondary" sx={styles.dangerBody}>
            {S.danger.description}
          </Typography>
          <Button color="error" variant="outlined" onClick={() => setConfirmOpen(true)}>
            {S.danger.deleteButton}
          </Button>
        </SectionCard>
      </Box>

      {/* Delete confirmation: typed keyword, deliberately stronger than ConfirmDialog */}
      <Dialog
        open={confirmOpen}
        onClose={deleting ? undefined : () => setConfirmOpen(false)}
        maxWidth="xs"
        fullWidth
      >
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
        <DialogActions sx={styles.dialogActions}>
          <Button color="inherit" onClick={() => setConfirmOpen(false)} disabled={deleting}>
            {S.danger.cancel}
          </Button>
          <Button
            color="error"
            variant="contained"
            disabled={confirmText !== S.danger.confirmKeyword || deleting}
            onClick={handleDelete}
            startIcon={deleting ? <CircularProgress size={16} color="inherit" /> : null}
          >
            {S.danger.confirmButton}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
