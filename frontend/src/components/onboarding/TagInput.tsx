import { Autocomplete, Chip, TextField } from '@mui/material';

type TagInputProps = {
  label: string;
  value: string[] | undefined;
  onChange: (value: string[]) => void;
  suggestions: string[];
  placeholder?: string;
};

/** Multi-value text input: pick suggestions or type your own and press Enter. */
export function TagInput({ label, value, onChange, suggestions, placeholder }: TagInputProps) {
  return (
    <Autocomplete<string, true, false, true>
      multiple
      freeSolo
      options={suggestions}
      value={value ?? []}
      onChange={(_event, next) => onChange(next.map((v) => v.trim()).filter(Boolean))}
      renderValue={(selected, getItemProps) =>
        selected.map((option, index) => {
          const { key, ...itemProps } = getItemProps({ index });
          return <Chip key={key} label={option} size="small" {...itemProps} />;
        })
      }
      renderInput={(params) => <TextField {...params} label={label} placeholder={placeholder} />}
    />
  );
}
