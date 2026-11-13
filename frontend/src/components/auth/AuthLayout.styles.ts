import { alpha, type SxProps, type Theme } from "@mui/material";
import { FONTS, RADIUS } from "../../theme";

/** Distance between the diary page's ruled lines; the handwriting sits on them. */
const LINE = 44;

export const authLayoutStyles = {
  root: {
    minHeight: "100svh",
    display: "flex",
    flexDirection: "column",
    // Transparent so the page's doodle texture (set on body by the theme) shows through.
    bgcolor: "transparent",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    maxWidth: 1080,
    mx: "auto",
    px: { xs: 2, sm: 3 },
    height: 64,
  },
  back: {
    display: "flex",
    alignItems: "center",
    gap: 0.5,
    fontWeight: 600,
    fontSize: "0.9rem",
  },
  container: {
    flex: 1,
    width: "100%",
    maxWidth: 1080,
    mx: "auto",
    px: { xs: 2, sm: 3 },
    pb: { xs: 3, md: 6 },
    display: "grid",
    gap: { xs: 0, md: 6 },
    gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "minmax(0, 1fr) minmax(0, 440px)" },
    alignItems: "center",
    alignContent: "center",
  },
  /* Today's diary page (md+): ruled paper, a clay margin, handwriting, set askew. */
  diary: ((theme) => ({
    position: "relative",
    display: { xs: "none", md: "block" },
    pl: 10,
    pr: 5,
    py: 5,
    bgcolor: theme.palette.background.paper,
    backgroundImage: `repeating-linear-gradient(transparent 0 ${LINE - 1}px, ${alpha(theme.palette.primary.main, 0.14)} ${LINE - 1}px ${LINE}px)`,
    backgroundPosition: "0 30px",
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: "4px",
    boxShadow: `0 18px 40px ${alpha(theme.palette.common.black, theme.palette.mode === "dark" ? 0.4 : 0.08)}`,
    transform: "rotate(-1.5deg)",
    "&::before": {
      content: '""',
      position: "absolute",
      top: 0,
      bottom: 0,
      left: 56,
      borderLeft: `2px solid ${alpha(theme.palette.secondary.main, 0.55)}`,
    },
  })) satisfies SxProps<Theme>,
  diaryTitle: {
    fontFamily: FONTS.display,
    fontWeight: 600,
    fontSize: "2.1rem",
    lineHeight: 1.1,
    letterSpacing: "-0.02em",
  },
  diaryTitleAccent: {
    fontFamily: FONTS.display,
    fontStyle: "italic",
    fontWeight: 600,
    fontSize: "2.1rem",
    lineHeight: 1.1,
    letterSpacing: "-0.02em",
    color: "primary.main",
    mb: 2,
  },
  diaryList: {
    listStyle: "none",
    m: 0,
    p: 0,
  },
  // A handwritten line on the rule, with its time in the margin.
  diaryLine: {
    position: "relative",
    fontFamily: FONTS.hand,
    fontSize: "1.65rem",
    fontWeight: 600,
    lineHeight: `${LINE}px`,
    color: "primary.main",
  },
  diaryTime: {
    position: "absolute",
    left: -72,
    width: 56,
    textAlign: "right",
    fontFamily: FONTS.body,
    fontSize: "0.8rem",
    fontWeight: 700,
    color: "text.secondary",
  },
  diaryNote: {
    fontFamily: FONTS.hand,
    fontSize: "1.45rem",
    fontWeight: 700,
    color: "secondary.main",
    mt: 2,
    transform: "rotate(-2deg)",
  },
  /* The form. */
  formCard: {
    p: { xs: 3, sm: 5 },
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    minWidth: 0,
    borderRadius: `${RADIUS.lg + 8}px`,
  },
  header: {
    mb: 3.5,
  },
  title: {
    fontSize: { xs: "2rem", sm: "2.3rem" },
    letterSpacing: "-0.02em",
  },
  footer: {
    mt: 3,
    textAlign: "center",
  },
};
