import { useState } from "react";
import {
  Box,
  Button,
  Chip,
  FormControlLabel,
  Skeleton,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { EditLocationAltRounded, SpaRounded } from "@mui/icons-material";
import toast from "react-hot-toast";
import { SEASON_STRINGS } from "../../constants/seasonStrings";
import {
  useSeason,
  useUpdateSeasonSettings,
} from "../../hooks/queries/useDietPlanQueries";
import { queryErrorMessage } from "../../hooks/queries/queryHelpers";
import { resolveApiError } from "../../lib/apiClient";
import type { SeasonView } from "../../types/season";
import { ErrorState } from "../ui/ErrorState";
import { SectionCard } from "../ui/SectionCard";
import { seasonCardStyles as styles } from "./SeasonCard.styles";

const S = SEASON_STRINGS.card;

const REGION_MAX = 60;

type RegionFormProps = {
  initial: string;
  onDone?: () => void;
};

/** City or state, saved to the food answers; the season follows from it. */
function RegionForm({ initial, onDone }: RegionFormProps) {
  const [region, setRegion] = useState(initial);
  const save = useUpdateSeasonSettings();
  const trimmed = region.trim();

  async function handleSave() {
    try {
      await save.mutateAsync({ region: trimmed });
      toast.success(S.saved);
      onDone?.();
    } catch (err) {
      toast.error(resolveApiError(err, S.error));
    }
  }

  return (
    <Box sx={styles.regionRow}>
      <TextField
        size="small"
        label={S.regionLabel}
        value={region}
        onChange={(e) => setRegion(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && trimmed) handleSave();
        }}
        sx={styles.regionField}
        slotProps={{ htmlInput: { maxLength: REGION_MAX } }}
      />
      <Button
        variant="contained"
        onClick={handleSave}
        disabled={!trimmed || save.isPending}
      >
        {save.isPending ? S.saving : S.save}
      </Button>
      {onDone && (
        <Button color="inherit" onClick={onDone}>
          {S.cancel}
        </Button>
      )}
    </Box>
  );
}

function SeasonDetails({ season }: { season: SeasonView }) {
  return (
    <>
      <Box>
        <Typography variant="body2" sx={styles.label}>
          {S.inSeason}
        </Typography>
        <Box sx={styles.chips}>
          {season.in_season.map((name) => (
            <Chip
              key={name}
              size="small"
              color="success"
              variant="outlined"
              icon={<SpaRounded />}
              label={name}
            />
          ))}
        </Box>
      </Box>
      <Box>
        <Typography variant="body2" sx={styles.label}>
          {S.outOfSeason}
        </Typography>
        {season.out_of_season.length ? (
          <Box sx={styles.chips}>
            {season.out_of_season.map((name) => (
              <Chip key={name} size="small" variant="outlined" label={name} />
            ))}
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary">
            {S.noneOut}
          </Typography>
        )}
      </Box>
      <Typography variant="caption" color="text.secondary">
        {S.staples}
      </Typography>
    </>
  );
}

/** Eating with the season: an opt-in switch, then where they live, what is in and out of season, and taseer. */
export function SeasonCard() {
  const query = useSeason();
  const update = useUpdateSeasonSettings();
  const [editing, setEditing] = useState(false);
  const data = query.data;
  const error = queryErrorMessage(query.error, S.loadError);

  async function saveSetting(
    setting: { follow_season: boolean } | { follow_taseer: boolean },
    message: string,
  ) {
    try {
      await update.mutateAsync(setting);
      toast.success(message);
    } catch (err) {
      toast.error(resolveApiError(err, S.error));
    }
  }

  if (query.isPending) return <Skeleton variant="rounded" height={120} />;
  if (error && !data)
    return <ErrorState message={error} onRetry={() => query.refetch()} />;
  if (!data) return null;

  const season = data.season;
  const on = data.follow_season;
  const seasonTitle = season ? S.title(season.season, season.region) : null;
  const title = on && seasonTitle ? seasonTitle : S.setupTitle;
  const subtitle = !on
    ? S.offSubtitle
    : season
      ? S.subtitle
      : data.region
        ? S.unknown(data.region)
        : S.setupBody;
  const showForm = on && (editing || !season);

  return (
    <SectionCard
      title={title}
      subtitle={subtitle}
      action={
        on && season && !editing ? (
          <Button
            size="small"
            startIcon={<EditLocationAltRounded />}
            onClick={() => setEditing(true)}
          >
            {S.changePlace}
          </Button>
        ) : undefined
      }
    >
      <Box sx={styles.body}>
        <SettingSwitch
          checked={on}
          disabled={update.isPending}
          label={S.seasonLabel}
          help={!on && season ? S.preview(season.season, season.region) : S.seasonHelp}
          onChange={(value) =>
            saveSetting({ follow_season: value }, value ? S.seasonOn : S.seasonOff)
          }
        />
        {showForm && (
          <RegionForm
            initial={data.region ?? ""}
            onDone={season ? () => setEditing(false) : undefined}
          />
        )}
        {on && season && <SeasonDetails season={season} />}
        {on && season && (
          <SettingSwitch
            checked={data.follow_taseer}
            disabled={update.isPending}
            label={S.taseerLabel}
            help={S.taseerHelp}
            onChange={(value) =>
              saveSetting({ follow_taseer: value }, value ? S.taseerOn : S.taseerOff)
            }
          />
        )}
      </Box>
    </SectionCard>
  );
}

type SettingSwitchProps = {
  checked: boolean;
  disabled: boolean;
  label: string;
  help: string;
  onChange: (value: boolean) => void;
};

function SettingSwitch({ checked, disabled, label, help, onChange }: SettingSwitchProps) {
  return (
    <FormControlLabel
      sx={styles.taseer}
      control={
        <Switch
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
        />
      }
      label={
        <Box sx={styles.taseerText}>
          <Typography variant="body2">{label}</Typography>
          <Typography variant="caption" color="text.secondary">
            {help}
          </Typography>
        </Box>
      }
    />
  );
}
