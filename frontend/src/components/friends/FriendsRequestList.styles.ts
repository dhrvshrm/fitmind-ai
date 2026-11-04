import type { SxProps, Theme } from "@mui/material";

export const friendsRequestListStyles = {
  row: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 1.5,
    py: 1.25,
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
  actions: {
    flexDirection: "row",
    gap: 1,
  },
  skeleton: {
    height: 72,
  },
} satisfies Record<string, SxProps<Theme>>;
