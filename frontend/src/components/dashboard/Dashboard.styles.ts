import type { SxProps, Theme } from "@mui/material";

export const dashboardStyles = {
  section: {
    mb: 2,
  },
  statsGrid: {
    display: "grid",
    gap: 2,
    gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", md: "repeat(4, minmax(0, 1fr))" },
  },
  actionsRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 1,
    mt: 2,
  },
  actionButton: {
    color: "text.primary",
    borderColor: "divider",
    bgcolor: "background.paper",
    "& .MuiButton-startIcon": { color: "primary.main" },
    "&:hover": { borderColor: "primary.main", bgcolor: "background.paper" },
  },
  sectionTitle: {
    mt: 4,
    mb: 2,
  },
  chartsGrid: {
    display: "grid",
    gap: 2,
    gridTemplateColumns: { xs: "minmax(0, 1fr)", lg: "repeat(2, minmax(0, 1fr))" },
  },
} satisfies Record<string, SxProps<Theme>>;
