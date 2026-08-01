import type { SxProps, Theme } from "@mui/material";

export const reportArchiveStyles = {
  controlsRow: {
    flexDirection: { xs: "column", sm: "row" },
    gap: 1.5,
    mb: 1,
  },
  searchField: {
    flex: 1,
  },
  searchIcon: {
    mr: 1,
  },
  sortControl: {
    minWidth: 160,
  },
  filterControl: {
    minWidth: 140,
  },
  resultCount: {
    display: "block",
    mb: 1.5,
  },
  list: {
    display: "grid",
    gap: 2,
  },
  empty: {
    py: 4,
    textAlign: "center",
  },
} satisfies Record<string, SxProps<Theme>>;
