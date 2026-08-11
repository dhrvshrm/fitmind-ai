import type { SxProps, Theme } from "@mui/material";

export const profilePageStyles = {
  root: {
    display: "flex",
    flexDirection: "column",
    gap: 3,
    maxWidth: 900,
  },
  header: {
    fontWeight: 800,
  },
  subtitle: {
    mb: 1,
  },
  heroCard: {
    p: { xs: 2.5, sm: 3 },
    borderRadius: 3,
    background: "linear-gradient(150deg, #ffffff 0%, #faf7ff 100%)",
    borderColor: "rgba(170, 59, 255, 0.14)",
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    flexWrap: "wrap",
  },
  avatar: {
    width: 72,
    height: 72,
    fontSize: 30,
    fontWeight: 800,
    background: "linear-gradient(150deg, #aa3bff 0%, #7a1fd0 100%)",
    boxShadow: "0px 8px 18px rgba(170, 59, 255, 0.35)",
  },
  username: {
    fontWeight: 700,
  },
  levelChip: {
    mt: 0.5,
    fontWeight: 600,
  },
  xpSection: {
    mt: 2.5,
  },
  xpBar: {
    height: 10,
    borderRadius: 5,
    mt: 0.5,
  },
  xpMeta: {
    mt: 0.5,
    display: "flex",
    justifyContent: "space-between",
  },
  statsGrid: {
    display: "grid",
    gap: 2,
    gridTemplateColumns: { xs: "repeat(2, 1fr)", sm: "repeat(4, 1fr)" },
  },
  statCard: {
    p: 2,
    borderRadius: 3,
    textAlign: "center",
  },
  statValue: {
    fontWeight: 800,
    lineHeight: 1.1,
  },
  sectionTitle: {
    fontWeight: 700,
    mb: 1.5,
  },
  badgeGrid: {
    display: "grid",
    gap: 1.5,
    gridTemplateColumns: { xs: "repeat(2, 1fr)", sm: "repeat(3, 1fr)" },
  },
  badge: {
    p: 2,
    borderRadius: 3,
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 0.5,
  },
  badgeLocked: {
    opacity: 0.45,
    filter: "grayscale(1)",
  },
  badgeIcon: {
    fontSize: 34,
    lineHeight: 1,
  },
  badgeName: {
    fontWeight: 700,
  },
  skeleton: {
    borderRadius: 3,
    height: 160,
  },
} satisfies Record<string, SxProps<Theme>>;
