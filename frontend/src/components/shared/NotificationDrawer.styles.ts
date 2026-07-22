import type { SxProps, Theme } from "@mui/material";

export const notificationDrawerStyles = {
  paper: {
    width: { xs: "100%", sm: 380 },
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    px: 2,
    py: 1.5,
    borderBottom: 1,
    borderColor: "divider",
  },
  title: {
    fontWeight: 700,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
  },
  markAllButton: {
    textTransform: "none",
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
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },
  empty: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    textAlign: "center",
    px: 3,
  },
  emptyIcon: {
    fontSize: 40,
    color: "text.disabled",
    mb: 1,
  },
} satisfies Record<string, SxProps<Theme>>;
