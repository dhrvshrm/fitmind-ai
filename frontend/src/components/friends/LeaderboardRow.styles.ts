import type { SxProps, Theme } from "@mui/material";

export const leaderboardRowStyles = {
  row: (isMe: boolean): SxProps<Theme> => ({
    flexDirection: "row",
    alignItems: "center",
    gap: 1.5,
    py: 1,
    px: isMe ? 1 : 0,
    mx: isMe ? -1 : 0,
    borderRadius: 2,
    bgcolor: isMe ? "rgba(170, 59, 255, 0.08)" : "transparent",
  }),
  rankBadge: (medalColor: string | null): SxProps<Theme> => ({
    width: 28,
    height: 28,
    borderRadius: "50%",
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    bgcolor: medalColor ?? "action.hover",
    color: medalColor ? "#fff" : "text.secondary",
  }),
  rankText: {
    fontWeight: 700,
    fontSize: "0.75rem",
  },
  avatar: {
    bgcolor: "primary.main",
    fontWeight: 700,
    width: 36,
    height: 36,
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 0.75,
  },
  username: {
    fontWeight: 700,
  },
  youChip: {
    height: 18,
    fontSize: "0.65rem",
  },
  xp: {
    fontWeight: 700,
    color: "primary.main",
    whiteSpace: "nowrap",
  },
};
