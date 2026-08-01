import type { SxProps, Theme } from "@mui/material";

export const reportDetailStyles = {
  root: {
    pt: 2,
  },
  highlightBox: {
    p: 2,
    borderRadius: 2.5,
    display: "flex",
    alignItems: "flex-start",
    gap: 1.25,
    background: "linear-gradient(155deg, rgba(170, 59, 255, 0.1) 0%, rgba(170, 59, 255, 0.04) 100%)",
    border: "1px solid rgba(170, 59, 255, 0.18)",
    mb: 2.5,
  },
  highlightIcon: {
    color: "primary.main",
    flexShrink: 0,
  },
  highlightText: {
    fontWeight: 600,
  },
  sectionTitle: {
    fontWeight: 700,
    mb: 1.25,
  },
  statsGrid: {
    display: "grid",
    gap: 1.5,
    gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(4, 1fr)" },
    mb: 2.5,
  },
  statCard: {
    p: 1.5,
    borderRadius: 2,
    bgcolor: "action.hover",
  },
  statLabel: {
    display: "block",
    mb: 0.5,
  },
  statValue: {
    fontWeight: 700,
  },
  workoutsProgress: {
    height: 6,
    borderRadius: 3,
    mt: 1,
  },
  macroRow: {
    flexDirection: "row",
    gap: 0.75,
    flexWrap: "wrap",
    mt: 0.5,
  },
  macroChip: (color: string): SxProps<Theme> => ({
    fontWeight: 700,
    fontSize: "0.75rem",
    color: "#fff",
    bgcolor: color,
    px: 1,
    py: 0.25,
    borderRadius: 5,
  }),
  trendRow: {
    flexDirection: "row",
    gap: 1.5,
    mb: 2.5,
    flexWrap: "wrap",
  },
  recapBox: {
    p: 2,
    borderRadius: 2.5,
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
    gap: 1.5,
  },
};
