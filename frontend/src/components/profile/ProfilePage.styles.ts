import type { SxProps, Theme } from "@mui/material";

export const profilePageStyles = {
  root: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    maxWidth: 900,
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  heroText: {
    minWidth: 0,
  },
  avatar: {
    width: 64,
    height: 64,
    fontSize: 26,
    fontWeight: 700,
    bgcolor: "primary.main",
    color: "primary.contrastText",
  },
  username: {
    overflowWrap: "anywhere",
  },
  levelChip: {
    mt: 0.75,
  },
  xpSection: {
    mt: 2.5,
  },
  xpMeta: {
    mt: 0.75,
    display: "flex",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 1,
  },
  statsGrid: {
    display: "grid",
    gap: 2,
    gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", sm: "repeat(4, minmax(0, 1fr))" },
  },
  badgeGrid: {
    display: "grid",
    gap: 1.5,
    gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", sm: "repeat(3, minmax(0, 1fr))" },
  },
  badge: (earned: boolean): SxProps<Theme> => ({
    p: 2,
    border: 1,
    borderColor: "divider",
    borderRadius: 1,
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 0.75,
    minWidth: 0,
    opacity: earned ? 1 : 0.55,
  }),
  badgeName: {
    fontWeight: 600,
  },
  skeleton: {
    height: 160,
  },
  statSkeleton: {
    height: 104,
  },
};
