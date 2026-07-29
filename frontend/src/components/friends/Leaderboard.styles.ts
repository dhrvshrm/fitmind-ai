import type { SxProps, Theme } from "@mui/material";

export const leaderboardStyles = {
  card: {
    p: { xs: 2.5, sm: 3 },
    borderRadius: 3,
  },
  title: {
    fontWeight: 700,
  },
  subtitle: {
    mb: 1.5,
  },
  empty: {
    py: 3,
    textAlign: "center",
  },
} satisfies Record<string, SxProps<Theme>>;
