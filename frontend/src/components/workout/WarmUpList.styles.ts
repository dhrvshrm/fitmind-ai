import { alpha, type SxProps, type Theme } from "@mui/material";

export const warmUpListStyles = {
  // A soft warm-toned panel above the day's exercises.
  root: ((theme) => ({
    mb: 2,
    p: 1.5,
    borderRadius: 2,
    border: `1px solid ${alpha(theme.palette.warning.main, 0.35)}`,
    bgcolor: alpha(
      theme.palette.warning.main,
      theme.palette.mode === "dark" ? 0.08 : 0.05,
    ),
  })) satisfies SxProps<Theme>,
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 1,
    mb: 1.5,
  },
  headerIcon: {
    color: "warning.main",
    mt: "2px",
  },
  phases: {
    listStyle: "none",
    m: 0,
    p: 0,
    display: "grid",
    gap: 1.5,
  },
  // Each phase hangs off a warm rule, like steps in a timeline.
  phase: ((theme) => ({
    pl: 1.5,
    borderLeft: `2px solid ${alpha(theme.palette.warning.main, 0.45)}`,
  })) satisfies SxProps<Theme>,
  phaseHead: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 1,
    mb: 1,
  },
  phaseNumber: {
    width: 22,
    height: 22,
    flexShrink: 0,
    borderRadius: "50%",
    display: "grid",
    placeItems: "center",
    fontSize: "0.75rem",
    fontWeight: 700,
    color: "warning.contrastText",
    bgcolor: "warning.main",
  },
  phaseIcon: {
    color: "warning.main",
    mt: "1px",
  },
  phaseTitle: {
    fontWeight: 700,
    lineHeight: 1.3,
  },
  moves: {
    listStyle: "none",
    m: 0,
    p: 0,
    display: "grid",
    gap: 0.75,
    gridTemplateColumns: {
      xs: "minmax(0, 1fr)",
      sm: "repeat(2, minmax(0, 1fr))",
    },
  },
  move: ((theme) => ({
    width: "100%",
    minHeight: 58,
    justifyContent: "flex-start",
    gap: 1.25,
    p: 0.75,
    borderRadius: 1.5,
    textAlign: "left",
    bgcolor: theme.palette.background.paper,
    border: `1px solid ${theme.palette.divider}`,
    "&:hover": { borderColor: theme.palette.warning.main },
    "&.Mui-disabled": { opacity: 1 },
  })) satisfies SxProps<Theme>,
  thumb: {
    width: 44,
    height: 44,
    flexShrink: 0,
    objectFit: "cover",
    borderRadius: 1,
  },
  moveText: {
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
  },
  moveName: {
    fontWeight: 600,
  },
  rampText: {
    py: 0.25,
  },
};
