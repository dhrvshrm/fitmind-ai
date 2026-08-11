import { useState, type FormEvent } from "react";
import {
  Box,
  Button,
  MenuItem,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import toast from "react-hot-toast";
import { settingsService } from "../../services/settingsService";
import { resolveApiError } from "../../lib/apiClient";
import { GOAL_OPTIONS } from "../../constants/onboarding";
import { STRINGS } from "../../constants/strings";
import type { FitnessGoal } from "../../types/onboarding";
import type {
  FullUserProfile,
  ProfileUpdatePayload,
} from "../../types/settings";
import { editProfileFormStyles as styles } from "./EditProfileForm.styles";

const S = STRINGS.profile.edit;

type EditProfileFormProps = {
  profile: FullUserProfile;
  onSaved: (profile: FullUserProfile) => void;
};

type FormState = {
  username: string;
  age: string;
  weight_kg: string;
  height_cm: string;
  fitness_goal: FitnessGoal | "";
};

type FormErrors = Partial<Record<keyof FormState, string>>;

/** Editable profile fields; PUTs changes to `/settings/profile`. */
export function EditProfileForm({ profile, onSaved }: EditProfileFormProps) {
  const [form, setForm] = useState<FormState>({
    username: profile.username ?? "",
    age: profile.age?.toString() ?? "",
    weight_kg: profile.weight_kg?.toString() ?? "",
    height_cm: profile.height_cm?.toString() ?? "",
    fitness_goal: profile.fitness_goal ?? "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);

  function update(patch: Partial<FormState>) {
    setForm((prev) => ({ ...prev, ...patch }));
  }

  function validate(): boolean {
    const next: FormErrors = {};
    if (!form.username.trim()) next.username = S.validation.nameRequired;
    if (form.age && (Number(form.age) < 1 || Number(form.age) > 120)) {
      next.age = S.validation.ageInvalid;
    }
    if (form.weight_kg && Number(form.weight_kg) <= 0) {
      next.weight_kg = S.validation.weightInvalid;
    }
    if (form.height_cm && Number(form.height_cm) <= 0) {
      next.height_cm = S.validation.heightInvalid;
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!validate()) return;

    const payload: ProfileUpdatePayload = { username: form.username.trim() };
    if (form.age) payload.age = Number(form.age);
    if (form.weight_kg) payload.weight_kg = Number(form.weight_kg);
    if (form.height_cm) payload.height_cm = Number(form.height_cm);
    if (form.fitness_goal) payload.fitness_goal = form.fitness_goal;

    setSaving(true);
    try {
      const updated = await settingsService.updateProfile(payload);
      onSaved(updated);
      toast.success(S.success);
    } catch (error) {
      toast.error(resolveApiError(error, S.error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Paper
      component="form"
      elevation={0}
      variant="outlined"
      sx={styles.card}
      onSubmit={handleSubmit}
    >
      <Typography variant="h6" sx={styles.title}>
        {S.title}
      </Typography>

      <Box sx={styles.grid}>
        <TextField
          label={S.name}
          value={form.username}
          onChange={(e) => update({ username: e.target.value })}
          error={Boolean(errors.username)}
          helperText={errors.username}
          sx={styles.fullWidth}
          fullWidth
        />
        <TextField
          label={S.age}
          type="number"
          value={form.age}
          onChange={(e) => update({ age: e.target.value })}
          error={Boolean(errors.age)}
          helperText={errors.age}
          fullWidth
        />
        <TextField
          label={S.weight}
          type="number"
          value={form.weight_kg}
          onChange={(e) => update({ weight_kg: e.target.value })}
          error={Boolean(errors.weight_kg)}
          helperText={errors.weight_kg}
          fullWidth
        />
        <TextField
          label={S.height}
          type="number"
          value={form.height_cm}
          onChange={(e) => update({ height_cm: e.target.value })}
          error={Boolean(errors.height_cm)}
          helperText={errors.height_cm}
          fullWidth
        />
        <TextField
          label={S.goal}
          select
          value={form.fitness_goal}
          onChange={(e) =>
            update({ fitness_goal: e.target.value as FitnessGoal })
          }
          fullWidth
        >
          {GOAL_OPTIONS.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.icon} {option.label}
            </MenuItem>
          ))}
        </TextField>
      </Box>

      <Box sx={styles.actions}>
        <Button type="submit" variant="contained" disabled={saving}>
          {saving ? S.saving : S.save}
        </Button>
      </Box>
    </Paper>
  );
}
