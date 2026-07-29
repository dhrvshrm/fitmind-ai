import type { SxProps, Theme } from "@mui/material";

export const friendsRequestListStyles = {
  card: {
    p: { xs: 2.5, sm: 3 },
    borderRadius: 3,
  },
  title: {
    fontWeight: 700,
    mb: 1.5,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 1.5,
    py: 1,
  },
  avatar: {
    bgcolor: "primary.main",
    fontWeight: 700,
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  username: {
    fontWeight: 700,
  },
  actions: {
    flexDirection: "row",
    gap: 1,
  },
  empty: {
    py: 2,
    textAlign: "center",
  },
} satisfies Record<string, SxProps<Theme>>;
