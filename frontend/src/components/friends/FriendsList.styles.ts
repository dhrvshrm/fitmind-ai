import type { SxProps, Theme } from "@mui/material";

export const friendsListStyles = {
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 1.5,
    py: 1,
    cursor: "pointer",
    borderRadius: 1,
    px: 1,
    mx: -1,
    "&:hover": {
      bgcolor: "action.hover",
    },
  },
  avatar: {
    bgcolor: "primary.main",
    color: "primary.contrastText",
    fontWeight: 700,
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  username: {
    fontWeight: 600,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  skeleton: {
    height: 72,
  },
} satisfies Record<string, SxProps<Theme>>;
