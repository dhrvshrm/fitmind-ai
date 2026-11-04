import { alpha, type SxProps, type Theme } from "@mui/material";
import { RADIUS } from "../../theme";

export const authLayoutStyles = {
  root: {
    minHeight: "100svh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    p: 2,
    bgcolor: "background.default",
  },
  container: {
    width: "100%",
    maxWidth: 960,
    display: "grid",
    gap: { xs: 0, md: 4 },
    gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "minmax(0, 1fr) minmax(0, 440px)" },
    alignItems: "stretch",
  },
  /* Left brand panel, hidden on small screens. */
  brandPanel: ((theme) => ({
    display: { xs: "none", md: "flex" },
    flexDirection: "column",
    justifyContent: "space-between",
    gap: 6,
    p: 5,
    borderRadius: `${RADIUS.lg}px`,
    border: `1px solid ${alpha(theme.palette.primary.main, 0.16)}`,
    bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === "light" ? 0.05 : 0.08),
  })) satisfies SxProps<Theme>,
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 1.25,
  },
  brandMark: {
    width: 32,
    height: 32,
    borderRadius: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    bgcolor: "primary.main",
    color: "primary.contrastText",
    flexShrink: 0,
  },
  heroTitle: {
    mt: 4,
    mb: 1.5,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 1.5,
  },
  /* Right form card. */
  formCard: {
    p: { xs: 3, sm: 5 },
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    minWidth: 0,
  },
  /* Brand row shown only when the left panel is hidden. */
  mobileBrand: {
    display: { xs: "flex", md: "none" },
    flexDirection: "row",
    alignItems: "center",
    gap: 1,
    mb: 3,
  },
  header: {
    mb: 3,
  },
  footer: {
    mt: 3,
    textAlign: "center",
  },
} satisfies Record<string, SxProps<Theme>>;
