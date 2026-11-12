import { Avatar, Box, Stack, Typography } from '@mui/material';
import { PersonRounded, SmartToyRounded } from '@mui/icons-material';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { formatTimestamp } from '../../utils/date';
import type { ChatMessage } from '../../types/chat';
import type { CoachProposal } from '../../types/coach';
import { ActionCard } from './ActionCard';
import { messageBubbleStyles as styles } from './MessageBubble.styles';

type MessageBubbleProps = {
  message: ChatMessage;
  busyProposalId: string | null;
  onConfirm: (proposal: CoachProposal) => void;
  onDismiss: (proposal: CoachProposal) => void;
};

/** One chat bubble: user vs assistant styling, streaming cursor, typing dots. */
export function MessageBubble({ message, busyProposalId, onConfirm, onDismiss }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const isError = message.status === 'error';
  const isStreaming = message.status === 'streaming';
  const isTyping = isStreaming && message.content.length === 0;

  return (
    <Stack sx={styles.row(isUser)}>
      {!isUser && (
        <Avatar sx={styles.avatar(isUser)}>
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
          ) : isUser ? (
            // User text is plain; preserve it exactly (pre-wrap on the bubble).
            <Typography variant="body2" component="span">
              {message.content}
            </Typography>
          ) : (
            // Assistant replies are Markdown (tables, lists, bold, headings).
            <Box sx={styles.markdown}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content}
              </ReactMarkdown>
              {isStreaming && <Box component="span" sx={styles.cursor} />}
            </Box>
          )}
        </Box>
        {message.proposals?.map((proposal) => (
          <ActionCard
            key={proposal.id}
            proposal={proposal}
            busy={busyProposalId !== null}
            onConfirm={onConfirm}
            onDismiss={onDismiss}
          />
        ))}
        <Typography variant="caption" color="text.secondary" sx={styles.timestamp}>
          {formatTimestamp(message.timestamp)}
        </Typography>
      </Box>

      {isUser && (
        <Avatar sx={styles.avatar(isUser)}>
          <PersonRounded fontSize="small" />
        </Avatar>
      )}
    </Stack>
  );
}
