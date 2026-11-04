import type { SxProps, Theme } from "@mui/material";

export const friendProfilePreviewStyles = {
  content: {
    textAlign: "center",
    pt: 3,
    pb: 2,
  },
  avatar: {
    width: 72,
    height: 72,
    mx: "auto",
    mb: 1.5,
    bgcolor: "primary.main",
    color: "primary.contrastText",
    fontSize: "1.75rem",
    fontWeight: 700,
  },
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 1,
    mt: 2,
  },
  actions: {
    px: 3,
    pb: 2.5,
  },
} satisfies Record<string, SxProps<Theme>>;
