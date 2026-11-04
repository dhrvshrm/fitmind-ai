import { useEffect, useRef } from 'react';
import { Box } from '@mui/material';
import { SmartToyRounded } from '@mui/icons-material';
import { MessageBubble } from './MessageBubble';
import { EmptyState } from '../ui/EmptyState';
import { STRINGS } from '../../constants/strings';
import type { ChatMessage } from '../../types/chat';
import { chatContainerStyles as styles } from './ChatContainer.styles';

const S = STRINGS.coach;

type ChatContainerProps = {
  messages: ChatMessage[];
};

/** Scrollable message list; auto-scrolls to the newest content and shows an empty state. */
export function ChatContainer({ messages }: ChatContainerProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <Box sx={styles.root}>
        <Box sx={styles.empty}>
          <EmptyState icon={SmartToyRounded} title={S.emptyTitle} description={S.emptyBody} />
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={styles.root}>
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
      <div ref={bottomRef} />
    </Box>
  );
}
