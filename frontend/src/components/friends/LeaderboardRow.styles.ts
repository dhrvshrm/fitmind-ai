import { alpha, type SxProps, type Theme } from "@mui/material";
import type { RankMedalTone } from "../../constants/friend";

export const leaderboardRowStyles = {
  row:
    (isMe: boolean): SxProps<Theme> =>
    (theme) => ({
      flexDirection: "row",
      alignItems: "center",
      gap: 1.5,
      py: 1,
      px: isMe ? 1 : 0,
      mx: isMe ? -1 : 0,
      borderRadius: 1,
      bgcolor: isMe ? alpha(theme.palette.primary.main, theme.palette.mode === "light" ? 0.08 : 0.14) : "transparent",
    }),
  rankBadge:
    (tone: RankMedalTone | null): SxProps<Theme> =>
    (theme) => {
      const color =
        tone === null ? null : tone === "neutral" ? theme.palette.text.secondary : theme.palette[tone].main;
      return {
        width: 28,
        height: 28,
        borderRadius: "50%",
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: color ? alpha(color, theme.palette.mode === "light" ? 0.14 : 0.2) : "action.hover",
        color: color ?? "text.secondary",
      };
    },
  rankText: {
    fontWeight: 700,
    fontSize: "0.75rem",
    fontVariantNumeric: "tabular-nums",
  },
  avatar: {
    bgcolor: "primary.main",
    color: "primary.contrastText",
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
    minWidth: 0,
  },
  username: {
    fontWeight: 600,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  youChip: {
    height: 18,
    fontSize: "0.65rem",
  },
  xp: {
    fontWeight: 700,
    color: "primary.main",
    whiteSpace: "nowrap",
    fontVariantNumeric: "tabular-nums",
  },
};
