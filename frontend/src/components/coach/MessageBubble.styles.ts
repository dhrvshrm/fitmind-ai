import { alpha, type SxProps, type Theme } from "@mui/material";

export const messageBubbleStyles = {
  row: (isUser: boolean): SxProps<Theme> => ({
    flexDirection: "row",
    justifyContent: isUser ? "flex-end" : "flex-start",
    alignItems: "flex-end",
    gap: 1,
    mb: 1.5,
  }),
  avatar: (isUser: boolean): SxProps<Theme> => (theme) => ({
    width: 32,
    height: 32,
    flexShrink: 0,
    color: isUser ? theme.palette.text.secondary : theme.palette.primary.main,
    bgcolor: isUser
      ? theme.palette.action.hover
      : alpha(theme.palette.primary.main, theme.palette.mode === "light" ? 0.1 : 0.16),
  }),
  column: (isUser: boolean): SxProps<Theme> => ({
    display: "flex",
    flexDirection: "column",
    alignItems: isUser ? "flex-end" : "flex-start",
    maxWidth: { xs: "85%", sm: "78%" },
    minWidth: 0,
  }),
  bubble: (isUser: boolean, isError: boolean): SxProps<Theme> => (theme) => ({
    px: 1.75,
    py: 1,
    maxWidth: "100%",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomRightRadius: isUser ? 4 : 16,
    borderBottomLeftRadius: isUser ? 16 : 4,
    wordBreak: "break-word",
    whiteSpace: "pre-wrap",
    border: isUser ? "none" : "1px solid",
    ...(isUser
      ? {
          bgcolor: theme.palette.primary.main,
          color: theme.palette.primary.contrastText,
        }
      : isError
        ? {
            bgcolor: alpha(theme.palette.error.main, theme.palette.mode === "light" ? 0.06 : 0.12),
            borderColor: alpha(theme.palette.error.main, 0.5),
            color: theme.palette.text.primary,
          }
        : {
            bgcolor: theme.palette.background.paper,
            borderColor: theme.palette.divider,
            color: theme.palette.text.primary,
          }),
  }),
  cursor: {
    display: "inline-block",
    width: "2px",
    height: "1em",
    ml: "2px",
    bgcolor: "currentColor",
    verticalAlign: "text-bottom",
    animation: "fitmind-cursor-blink 1s step-start infinite",
    "@keyframes fitmind-cursor-blink": {
      "50%": { opacity: 0 },
    },
  } satisfies SxProps<Theme>,
  typingDots: {
    flexDirection: "row",
    alignItems: "center",
    gap: 0.5,
    py: 0.25,
  } satisfies SxProps<Theme>,
  /** Typing indicator: a gentle opacity pulse (no bounce). */
  dot: (delay: number): SxProps<Theme> => ({
    width: 6,
    height: 6,
    borderRadius: "50%",
    bgcolor: "text.secondary",
    animation: "fitmind-typing-pulse 1.2s ease-in-out infinite",
    animationDelay: `${delay}s`,
    "@keyframes fitmind-typing-pulse": {
      "0%, 60%, 100%": { opacity: 0.3 },
      "30%": { opacity: 1 },
    },
  }),
  timestamp: {
    mt: 0.25,
    mx: 0.5,
  } satisfies SxProps<Theme>,
  // Rendered Markdown in assistant messages. Every color comes from the
  // palette so code, tables and links stay readable in light and dark mode.
  markdown: ((theme) => ({
    whiteSpace: "normal",
    fontSize: "0.875rem",
    lineHeight: 1.6,
    "& > *:first-of-type": { mt: 0 },
    "& > *:last-child": { mb: 0 },
    "& p": { m: 0, mb: 1 },
    "& ul, & ol": { pl: 2.5, m: 0, mb: 1 },
    "& li": { mb: 0.25 },
    "& h1, & h2, & h3, & h4, & h5, & h6": {
      fontFamily: theme.typography.h6.fontFamily,
      fontSize: "1rem",
      fontWeight: 600,
      mt: 1.5,
      mb: 0.5,
      lineHeight: 1.3,
    },
    "& a": {
      color: theme.palette.primary.main,
      textDecoration: "underline",
      textUnderlineOffset: "2px",
    },
    "& code": {
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
      fontSize: "0.85em",
      bgcolor: theme.palette.action.hover,
      border: `1px solid ${theme.palette.divider}`,
      px: 0.5,
      py: "1px",
      borderRadius: 0.5,
    },
    "& pre": {
      bgcolor: theme.palette.background.default,
      border: `1px solid ${theme.palette.divider}`,
      p: 1.25,
      borderRadius: 1,
      overflowX: "auto",
      my: 1,
    },
    "& pre code": { bgcolor: "transparent", border: 0, p: 0 },
    "& blockquote": {
      borderLeft: `3px solid ${alpha(theme.palette.primary.main, 0.4)}`,
      pl: 1.5,
      ml: 0,
      color: theme.palette.text.secondary,
    },
    "& hr": { border: 0, borderTop: `1px solid ${theme.palette.divider}`, my: 1 },
    "& table": {
      borderCollapse: "collapse",
      display: "block",
      maxWidth: "100%",
      overflowX: "auto",
      my: 1,
      fontSize: "0.85em",
    },
    "& th, & td": {
      border: `1px solid ${theme.palette.divider}`,
      px: 1,
      py: 0.5,
      textAlign: "left",
    },
    "& th": { bgcolor: theme.palette.action.hover, fontWeight: 600 },
    "& strong": { fontWeight: 700 },
  })) satisfies SxProps<Theme>,
};
