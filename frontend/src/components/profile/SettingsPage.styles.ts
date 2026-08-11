import type { SxProps, Theme } from "@mui/material";

export const settingsPageStyles = {
  root: {
    display: "flex",
    flexDirection: "column",
    gap: 3,
    maxWidth: 720,
  },
  header: {
    fontWeight: 800,
  },
  subtitle: {
    mb: 1,
  },
  card: {
    p: { xs: 2.5, sm: 3 },
    borderRadius: 3,
  },
  sectionTitle: {
    fontWeight: 700,
  },
  sectionSubtitle: {
    mb: 1.5,
  },
  toggleRow: {
    py: 0.5,
  },
  dangerCard: {
    p: { xs: 2.5, sm: 3 },
    borderRadius: 3,
    borderColor: "error.main",
  },
  dangerTitle: {
    fontWeight: 700,
    color: "error.main",
  },
  dangerBody: {
    my: 1.5,
  },
  confirmField: {
    mt: 2,
  },
} satisfies Record<string, SxProps<Theme>>;
