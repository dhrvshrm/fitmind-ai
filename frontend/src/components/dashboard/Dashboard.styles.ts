import type { SxProps, Theme } from "@mui/material";

export const dashboardStyles = {
  section: {
    mt: 2,
  },
  // Five tiles: 2 + a full-width last one on phones, 3 + 2 on tablets, one row on desktop.
  statsGrid: {
    display: "grid",
    gap: 2,
    gridTemplateColumns: {
      xs: "repeat(2, minmax(0, 1fr))",
      sm: "repeat(3, minmax(0, 1fr))",
      lg: "repeat(5, minmax(0, 1fr))",
    },
    "& > :last-child": { gridColumn: { xs: "1 / -1", sm: "auto" } },
  },
  // Paired cards side by side on wide screens, stretched to the same height.
  twoColumn: {
    display: "grid",
    gap: 2,
    mt: 2,
    alignItems: "stretch",
    gridTemplateColumns: { xs: "minmax(0, 1fr)", lg: "repeat(2, minmax(0, 1fr))" },
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
