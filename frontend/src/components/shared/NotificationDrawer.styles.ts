import type { SxProps, Theme } from "@mui/material";

export const notificationDrawerStyles = {
  paper: {
    width: { xs: "100%", sm: 380 },
    borderLeft: 1,
    borderColor: "divider",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 1,
    px: 2,
    py: 1.5,
    borderBottom: 1,
    borderColor: "divider",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 1,
  },
  list: {
    flex: 1,
    overflowY: "auto",
  },
  groupLabel: {
    px: 2,
    pt: 1.5,
    pb: 0.5,
    display: "block",
  },
  empty: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    px: 1,
  },
} satisfies Record<string, SxProps<Theme>>;
