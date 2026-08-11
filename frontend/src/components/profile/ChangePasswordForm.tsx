import { useState, type FormEvent } from "react";
import { Box, Button, TextField } from "@mui/material";
import toast from "react-hot-toast";
import { settingsService } from "../../services/settingsService";
import { resolveApiError } from "../../lib/apiClient";
import { STRINGS } from "../../constants/strings";
import { changePasswordFormStyles as styles } from "./ChangePasswordForm.styles";

const S = STRINGS.settings.password;

type FormState = {
  current: string;
  next: string;
  confirm: string;
};

type FormErrors = Partial<Record<keyof FormState, string>>;

const EMPTY: FormState = { current: "", next: "", confirm: "" };

/** Change-password form; POSTs to `/settings/change-password`. */
export function ChangePasswordForm() {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  function update(patch: Partial<FormState>) {
    setForm((prev) => ({ ...prev, ...patch }));
  }

  function validate(): boolean {
    const next: FormErrors = {};
    if (!form.current) next.current = S.validation.currentRequired;
    if (form.next.length < 8) next.next = S.validation.newTooShort;
    if (form.confirm !== form.next) next.confirm = S.validation.confirmMismatch;
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      await settingsService.changePassword({
        current_password: form.current,
        new_password: form.next,
      });
      setForm(EMPTY);
      setErrors({});
      toast.success(S.success);
    } catch (error) {
      toast.error(resolveApiError(error, S.error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Box component="form" sx={styles.fields} onSubmit={handleSubmit}>
      <TextField
        label={S.current}
        type="password"
        value={form.current}
        onChange={(e) => update({ current: e.target.value })}
        error={Boolean(errors.current)}
        helperText={errors.current}
        autoComplete="current-password"
        fullWidth
      />
      <TextField
        label={S.next}
        type="password"
        value={form.next}
        onChange={(e) => update({ next: e.target.value })}
        error={Boolean(errors.next)}
        helperText={errors.next}
        autoComplete="new-password"
        fullWidth
      />
      <TextField
        label={S.confirm}
        type="password"
        value={form.confirm}
        onChange={(e) => update({ confirm: e.target.value })}
        error={Boolean(errors.confirm)}
        helperText={errors.confirm}
        autoComplete="new-password"
        fullWidth
      />
      <Box sx={styles.actions}>
        <Button type="submit" variant="contained" disabled={submitting}>
          {submitting ? S.submitting : S.submit}
        </Button>
      </Box>
    </Box>
  );
}
