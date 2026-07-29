import type { SxProps, Theme } from "@mui/material";

export const friendsListStyles = {
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
    cursor: "pointer",
    borderRadius: 2,
    px: 1,
    mx: -1,
    "&:hover": {
      bgcolor: "action.hover",
    },
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
  empty: {
    py: 2,
    textAlign: "center",
  },
} satisfies Record<string, SxProps<Theme>>;
