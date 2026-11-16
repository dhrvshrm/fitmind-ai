import { alpha, type SxProps, type Theme } from "@mui/material";
import { FONTS } from "../../theme";
import { pgSectionStyles } from "./PgSection.styles";

/** Times and rupees, like the PG chit and the day timeline's receipt. */
const MONO = "ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace";

export const supplementsSectionStyles = {
  // Same rhythm and type as the PG section, mirrored: the organiser sits on the left.
  root: pgSectionStyles.root,
  inner: {
    ...pgSectionStyles.inner,
    gridTemplateColumns: {
      xs: "minmax(0, 1fr)",
      md: "minmax(0, 1fr) minmax(0, 1.1fr)",
    },
    // The text comes first on a phone; on wide screens it moves to the right.
    "& > :first-of-type": { order: { md: 1 } },
  },
  eyebrow: pgSectionStyles.eyebrow,
  title: pgSectionStyles.title,
  titleAccent: pgSectionStyles.titleAccent,
  body: pgSectionStyles.body,
  points: pgSectionStyles.points,
  point: pgSectionStyles.point,
  check: pgSectionStyles.check,
  cta: pgSectionStyles.cta,
  boxWrap: {
    display: "flex",
    justifyContent: "center",
  },
  // A pill organiser: a rounded tray with one compartment per time of day.
  box: ((theme) => ({
    position: "relative",
    width: "100%",
    maxWidth: 400,
    p: 2.5,
    pb: 3,
    bgcolor: theme.palette.background.paper,
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: "22px",
    boxShadow: `0 14px 32px ${alpha(theme.palette.common.black, theme.palette.mode === "dark" ? 0.45 : 0.1)}`,
    transform: { md: "rotate(-1.5deg)" },
  })) satisfies SxProps<Theme>,
  example: {
    fontSize: "0.7rem",
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "text.secondary",
  },
  boxTitle: {
    fontFamily: FONTS.display,
    fontWeight: 600,
    fontSize: "1.35rem",
  },
  budget: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 0.75,
    mt: 1.25,
  },
  slots: {
    listStyle: "none",
    m: 0,
    mt: 2,
    p: 0,
    display: "grid",
    gap: 1,
  },
  // One compartment; a ticked one goes green like the app's taken state.
  slot: (done: boolean) =>
    ((theme: Theme) => ({
      px: 1.75,
      py: 1.25,
      borderRadius: "14px",
      border: `1px solid ${done ? alpha(theme.palette.success.main, 0.5) : theme.palette.divider}`,
      bgcolor: done
        ? alpha(theme.palette.success.main, 0.08)
        : alpha(
            theme.palette.primary.main,
            theme.palette.mode === "dark" ? 0.08 : 0.04,
          ),
    })) satisfies SxProps<Theme>,
  slotHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 1,
  },
  slotTime: {
    fontFamily: MONO,
    fontSize: "0.8rem",
    color: "text.secondary",
  },
  slotWhen: {
    flex: 1,
    fontSize: "0.8rem",
    fontWeight: 700,
  },
  slotCheck: {
    color: "success.main",
  },
  slotWhat: {
    fontFamily: FONTS.hand,
    fontSize: "1.3rem",
    fontWeight: 600,
    color: "primary.main",
    lineHeight: 1.25,
  },
  total: ((theme) => ({
    flexDirection: "row",
    justifyContent: "space-between",
    mt: 1.75,
    pt: 1,
    borderTop: `2px dashed ${theme.palette.divider}`,
    fontFamily: MONO,
    fontWeight: 700,
  })) satisfies SxProps<Theme>,
  never: {
    flexDirection: "row",
    alignItems: "center",
    gap: 0.75,
    mt: 1,
    color: "text.secondary",
  },
  neverIcon: {
    fontSize: 16,
    color: "error.main",
  },
  note: {
    position: "absolute",
    right: 16,
    bottom: -18,
    fontFamily: FONTS.hand,
    fontSize: "1.4rem",
    fontWeight: 700,
    color: "secondary.main",
    transform: "rotate(-4deg)",
  },
};
