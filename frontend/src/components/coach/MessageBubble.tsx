import { Avatar, Box, Stack, Typography } from '@mui/material';
import { PersonRounded, SmartToyRounded } from '@mui/icons-material';
import { formatTimestamp } from '../../utils/date';
import type { ChatMessage } from '../../types/chat';
import { messageBubbleStyles as styles } from './MessageBubble.styles';

type MessageBubbleProps = {
  message: ChatMessage;
};

/** One chat bubble: user vs assistant styling, streaming cursor, typing dots. */
export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const isError = message.status === 'error';
  const isStreaming = message.status === 'streaming';
  const isTyping = isStreaming && message.content.length === 0;

  return (
    <Stack sx={styles.row(isUser)}>
      {!isUser && (
        <Avatar sx={styles.avatar}>
          <SmartToyRounded fontSize="small" />
        </Avatar>
      )}

      <Box sx={styles.column(isUser)}>
        <Box sx={styles.bubble(isUser, isError)}>
          {isTyping ? (
            <Stack sx={styles.typingDots}>
              <Box sx={styles.dot(0)} />
              <Box sx={styles.dot(0.15)} />
              <Box sx={styles.dot(0.3)} />
            </Stack>
          ) : (
            <Typography variant="body2" component="span">
              {message.content}
              {isStreaming && <Box component="span" sx={styles.cursor} />}
            </Typography>
          )}
        </Box>
        <Typography variant="caption" color="text.secondary" sx={styles.timestamp}>
          {formatTimestamp(message.timestamp)}
        </Typography>
      </Box>

      {isUser && (
        <Avatar sx={styles.avatar}>
          <PersonRounded fontSize="small" />
        </Avatar>
      )}
    </Stack>
  );
}
