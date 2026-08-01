import { useState } from "react";
import {
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
  type SelectChangeEvent,
} from "@mui/material";
import { SearchRounded } from "@mui/icons-material";
import { ReportCard } from "./ReportCard";
import { STRINGS } from "../../constants/strings";
import { reportMatchesQuery } from "../../utils/report";
import type { WeeklyReport } from "../../types/report";
import { reportArchiveStyles as styles } from "./ReportArchive.styles";

const S = STRINGS.reports.archive;

type SortOption = "newest" | "oldest" | "mostXp" | "mostWorkouts";
type FilterOption = "all" | "improving" | "stable" | "declining";

type ReportArchiveProps = {
  /** Non-empty report list — the caller handles the "no reports at all" state. */
  reports: WeeklyReport[];
};

/** Searchable, sortable, filterable archive of past weekly reports. */
export function ReportArchive({ reports }: ReportArchiveProps) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortOption>("newest");
  const [filter, setFilter] = useState<FilterOption>("all");

  const visible = reports
    .filter((r) => filter === "all" || r.mood_trend === filter)
    .filter((r) => reportMatchesQuery(r, query))
    .sort((a, b) => {
      switch (sort) {
        case "oldest":
          return a.week_start.localeCompare(b.week_start);
        case "mostXp":
          return b.xp_earned - a.xp_earned;
        case "mostWorkouts":
          return b.workouts_completed - a.workouts_completed;
        default:
          return b.week_start.localeCompare(a.week_start);
      }
    });

  return (
    <Box>
      <Stack sx={styles.controlsRow}>
        <TextField
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={S.searchPlaceholder}
          aria-label={S.searchAria}
          size="small"
          sx={styles.searchField}
          slotProps={{
            input: {
              startAdornment: <SearchRounded fontSize="small" sx={styles.searchIcon} />,
            },
          }}
        />

        <FormControl size="small" sx={styles.sortControl}>
          <InputLabel id="report-sort-label">{S.sortLabel}</InputLabel>
          <Select
            labelId="report-sort-label"
            label={S.sortLabel}
            value={sort}
            onChange={(e: SelectChangeEvent) => setSort(e.target.value as SortOption)}
          >
            <MenuItem value="newest">{S.sortOptions.newest}</MenuItem>
            <MenuItem value="oldest">{S.sortOptions.oldest}</MenuItem>
            <MenuItem value="mostXp">{S.sortOptions.mostXp}</MenuItem>
            <MenuItem value="mostWorkouts">{S.sortOptions.mostWorkouts}</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={styles.filterControl}>
          <InputLabel id="report-filter-label">{S.filterLabel}</InputLabel>
          <Select
            labelId="report-filter-label"
            label={S.filterLabel}
            value={filter}
            onChange={(e: SelectChangeEvent) => setFilter(e.target.value as FilterOption)}
          >
            <MenuItem value="all">{S.filterOptions.all}</MenuItem>
            <MenuItem value="improving">{S.filterOptions.improving}</MenuItem>
            <MenuItem value="stable">{S.filterOptions.stable}</MenuItem>
            <MenuItem value="declining">{S.filterOptions.declining}</MenuItem>
          </Select>
        </FormControl>
      </Stack>

      <Typography variant="caption" color="text.secondary" sx={styles.resultCount}>
        {S.resultCount(visible.length)}
      </Typography>

      {visible.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={styles.empty}>
          {S.noMatches}
        </Typography>
      ) : (
        <Box sx={styles.list}>
          {visible.map((report) => (
            <ReportCard key={report.id} report={report} />
          ))}
        </Box>
      )}
    </Box>
  );
}
