import { alpha, type SxProps, type Theme } from "@mui/material";

export const reportDetailStyles = {
  root: {
    pt: 2,
  },
  highlightBox: ((theme: Theme) => ({
    p: 2,
    borderRadius: 1,
    display: "flex",
    alignItems: "flex-start",
    gap: 1.25,
    bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === "light" ? 0.06 : 0.1),
    border: "1px solid",
    borderColor: alpha(theme.palette.primary.main, 0.2),
    mb: 2.5,
  })) satisfies SxProps<Theme>,
  highlightIcon: {
    color: "primary.main",
    flexShrink: 0,
  },
  highlightText: {
    fontWeight: 600,
  },
  sectionTitle: {
    mb: 1.25,
  },
  statsGrid: {
    display: "grid",
    gap: 1.5,
    gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", sm: "repeat(4, minmax(0, 1fr))" },
    mb: 2.5,
  },
  statCard: {
    p: 1.5,
    borderRadius: 1,
    bgcolor: "action.hover",
    minWidth: 0,
  },
  statLabel: {
    display: "block",
    mb: 0.5,
  },
  statValue: {
    fontWeight: 700,
    fontVariantNumeric: "tabular-nums",
  },
  workoutsProgress: {
    height: 6,
    mt: 1,
  },
  macroRow: {
    flexDirection: "row",
    gap: 0.75,
    flexWrap: "wrap",
    mt: 0.5,
  },
  macroChip:
    (color: string): SxProps<Theme> =>
    (theme) => ({
      fontWeight: 700,
      fontSize: "0.75rem",
      color: theme.palette.getContrastText(color),
      bgcolor: color,
      px: 1,
      py: 0.25,
      borderRadius: 0.5,
    }),
  trendRow: {
    flexDirection: "row",
    gap: 1.5,
    mb: 2.5,
    flexWrap: "wrap",
  },
  recapBox: {
    p: 2,
    borderRadius: 1,
    bgcolor: "background.paper",
    border: "1px solid",
    borderColor: "divider",
    mb: 2.5,
  },
  recapText: {
    whiteSpace: "pre-wrap",
    lineHeight: 1.7,
  },
  actionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 1.5,
  },
};
