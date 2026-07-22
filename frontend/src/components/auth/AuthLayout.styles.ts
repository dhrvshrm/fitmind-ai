import type { SxProps, Theme } from "@mui/material";

export const authLayoutStyles = {
  root: {
    minHeight: "100svh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    p: 2,
    background:
      "radial-gradient(1200px 560px at 85% -10%, #efe0ff 0%, rgba(239,224,255,0) 58%), linear-gradient(160deg, #f7f6fb 0%, #efe6fb 100%)",
  },
  card: {
    width: "100%",
    maxWidth: 880,
    borderRadius: 4,
    display: "flex",
    overflow: "hidden",
  },
  /* Left branding panel - hidden on small screens. */
  brandPanel: {
    display: { xs: "none", md: "flex" },
    flexDirection: "column",
    justifyContent: "space-between",
    gap: 6,
    width: 360,
    flexShrink: 0,
    p: 5,
    color: "#fff",
    background: "linear-gradient(160deg, #7a1fd0 0%, #aa3bff 100%)",
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 1,
  },
  brandName: {
    fontWeight: 700,
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontWeight: 700,
    lineHeight: 1.25,
    mt: 1,
  },
  tagline: {
    opacity: 0.85,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 1.5,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 2,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    bgcolor: "rgba(255, 255, 255, 0.16)",
  },
  featureText: {
    opacity: 0.95,
  },
  /* Right form panel. */
  formPanel: {
    flex: 1,
    p: { xs: 3, sm: 5 },
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
  },
  header: {
    mb: 3,
    textAlign: { xs: "center", md: "left" },
  },
  /* Brand overline shown only when the left panel is hidden. */
  mobileBrand: {
    fontWeight: 700,
    display: { xs: "block", md: "none" },
  },
  title: {
    fontWeight: 700,
  },
  footer: {
    mt: 3,
    textAlign: "center",
  },
} satisfies Record<string, SxProps<Theme>>;
