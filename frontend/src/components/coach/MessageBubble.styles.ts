import type { SxProps, Theme } from '@mui/material';

export const messageBubbleStyles = {
  row: (isUser: boolean): SxProps<Theme> => ({
    flexDirection: 'row',
    justifyContent: isUser ? 'flex-end' : 'flex-start',
    alignItems: 'flex-end',
    gap: 1,
    mb: 1.5,
  }),
  avatar: {
    width: 32,
    height: 32,
    flexShrink: 0,
    color: '#fff',
    background: 'linear-gradient(150deg, #aa3bff 0%, #7a1fd0 100%)',
  },
  column: (isUser: boolean): SxProps<Theme> => ({
    display: 'flex',
    flexDirection: 'column',
    alignItems: isUser ? 'flex-end' : 'flex-start',
    maxWidth: '78%',
  }),
  bubble: (isUser: boolean, isError: boolean): SxProps<Theme> => ({
    px: 1.75,
    py: 1,
    borderRadius: 3,
    borderBottomRightRadius: isUser ? 4 : 3,
    borderBottomLeftRadius: isUser ? 3 : 4,
    wordBreak: 'break-word',
    whiteSpace: 'pre-wrap',
    bgcolor: isError ? 'error.main' : isUser ? 'primary.main' : 'background.paper',
    color: isError || isUser ? '#fff' : 'text.primary',
    border: isUser || isError ? 'none' : '1px solid',
    borderColor: 'divider',
  }),
  cursor: {
    display: 'inline-block',
    width: '2px',
    height: '1em',
    ml: '2px',
    bgcolor: 'currentColor',
    verticalAlign: 'text-bottom',
    animation: 'fitmind-cursor-blink 1s step-start infinite',
    '@keyframes fitmind-cursor-blink': {
      '50%': { opacity: 0 },
    },
  },
  typingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0.5,
    py: 0.25,
  },
  dot: (delay: number): SxProps<Theme> => ({
    width: 6,
    height: 6,
    borderRadius: '50%',
    bgcolor: 'text.disabled',
    animation: 'fitmind-typing-bounce 1.2s ease-in-out infinite',
    animationDelay: `${delay}s`,
    '@keyframes fitmind-typing-bounce': {
      '0%, 60%, 100%': { transform: 'translateY(0)', opacity: 0.5 },
      '30%': { transform: 'translateY(-4px)', opacity: 1 },
    },
  }),
  timestamp: {
    mt: 0.25,
    mx: 0.5,
  },
};
