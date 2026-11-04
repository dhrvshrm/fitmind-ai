import type { SxProps, Theme } from "@mui/material";

export const settingsPageStyles = {
  root: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    maxWidth: 720,
  },
  modeGroup: {
    flexWrap: "wrap",
  },
  modeButton: {
    gap: 1,
    px: 2,
    textTransform: "none",
    fontWeight: 600,
  },
  prefsSkeleton: {
    height: 220,
  },
  toggleList: {
    display: "flex",
    flexDirection: "column",
  },
  toggleRow: {
    mx: 0,
    py: 0.5,
    justifyContent: "space-between",
    gap: 2,
    "&:not(:last-of-type)": {
      borderBottom: 1,
      borderColor: "divider",
    },
  },
  /* Tints the danger-zone card border without restyling SectionCard itself. */
  dangerWrap: {
    "& > .MuiCard-root": {
      borderColor: "error.main",
    },
    "& h2": {
      color: "error.main",
    },
  },
  dangerBody: {
    mb: 2,
  },
  confirmField: {
    mt: 2,
  },
  dialogActions: {
    px: 3,
    pb: 2,
  },
} satisfies Record<string, SxProps<Theme>>;
