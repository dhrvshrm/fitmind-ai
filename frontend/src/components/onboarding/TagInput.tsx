import { useState, type KeyboardEvent } from "react";
import { Box, Chip, TextField, Typography } from "@mui/material";
import { AddRounded, CheckRounded } from "@mui/icons-material";
import { ONBOARDING_STRINGS } from "../../constants/onboarding";
import { tagInputStyles as styles } from "./TagInput.styles";

const S = ONBOARDING_STRINGS.tags;
/** Suggestions shown before "More" on long lists, so the step stays short. */
const VISIBLE_SUGGESTIONS = 12;

type TagInputProps = {
  label: string;
  value: string[] | undefined;
  onChange: (value: string[]) => void;
  suggestions: string[];
  /** Placeholder for the "add your own" box. */
  placeholder?: string;
  /** Items picked in a related list (likes vs dislikes) are hidden here. */
  excluded?: string[];
};

const same = (a: string, b: string) =>
  a.trim().toLowerCase() === b.trim().toLowerCase();
const capitalise = (text: string) =>
  text.charAt(0).toUpperCase() + text.slice(1);

/**
 * Multi-select answers as tap-to-toggle chips, plus a box for anything not
 * listed (Enter adds it; commas add several at once). No dropdowns, so
 * picking ten foods is ten taps.
 */
export function TagInput({
  label,
  value,
  onChange,
  suggestions,
  placeholder,
  excluded = [],
}: TagInputProps) {
  const selected = value ?? [];
  const [draft, setDraft] = useState("");
  const [expanded, setExpanded] = useState(false);
  // The add box only opens when asked for, so the step isn't a wall of inputs.
  const [adding, setAdding] = useState(false);

  const isSelected = (item: string) => selected.some((s) => same(s, item));
  const available = suggestions.filter(
    (item) => !excluded.some((e) => same(e, item)),
  );
  // Selected suggestions always stay visible, even when the list is collapsed.
  const shown = expanded
    ? available
    : available.filter(
        (item, index) => index < VISIBLE_SUGGESTIONS || isSelected(item),
      );
  const hiddenCount = available.length - shown.length;
  const custom = selected.filter(
    (item) => !suggestions.some((s) => same(s, item)),
  );

  function toggle(item: string) {
    onChange(
      isSelected(item)
        ? selected.filter((s) => !same(s, item))
        : [...selected, item],
    );
  }

  function addDraft() {
    const items = draft
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
    if (items.length === 0) return;
    const next = [...selected];
    for (const item of items) {
      const known = suggestions.find((s) => same(s, item)) ?? capitalise(item);
      if (!next.some((s) => same(s, known))) next.push(known);
    }
    onChange(next);
    setDraft("");
  }

  function handleBlur() {
    addDraft();
    setAdding(false);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addDraft();
    }
  }

  return (
    <Box role="group" aria-label={label}>
      <Typography variant="subtitle2" sx={styles.label}>
        {label}
        {selected.length > 0 && (
          <Typography
            component="span"
            variant="caption"
            color="text.secondary"
            sx={styles.count}
          >
            {S.selected(selected.length)}
          </Typography>
        )}
      </Typography>

      <Box sx={styles.chips}>
        {shown.map((item) => {
          const on = isSelected(item);
          return (
            <Chip
              key={item}
              label={item}
              color={on ? "primary" : "default"}
              variant={on ? "filled" : "outlined"}
              icon={on ? <CheckRounded /> : undefined}
              onClick={() => toggle(item)}
              aria-pressed={on}
            />
          );
        })}
        {custom.map((item) => (
          <Chip
            key={`custom-${item}`}
            label={item}
            color="primary"
            icon={<CheckRounded />}
            onDelete={() => toggle(item)}
            aria-label={S.remove(item)}
          />
        ))}
        {!adding && (
          <Chip
            label={S.addChip}
            variant="outlined"
            icon={<AddRounded />}
            onClick={() => setAdding(true)}
            sx={styles.moreChip}
          />
        )}
        {(hiddenCount > 0 || expanded) &&
          available.length > VISIBLE_SUGGESTIONS && (
            <Chip
              label={expanded ? S.less : S.more(hiddenCount)}
              variant="outlined"
              onClick={() => setExpanded((e) => !e)}
              sx={styles.moreChip}
            />
          )}
      </Box>

      {adding && (
        <TextField
          autoFocus
          size="small"
          fullWidth
          value={draft}
          placeholder={placeholder ?? S.addPlaceholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          helperText={S.addHint}
          sx={styles.input}
          slotProps={{
            htmlInput: { maxLength: 120, "aria-label": S.addAria(label) },
            input: {
              startAdornment: (
                <AddRounded fontSize="small" sx={styles.addIcon} />
              ),
            },
          }}
        />
      )}
    </Box>
  );
}
