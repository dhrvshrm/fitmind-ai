import { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Chip, Paper, Typography } from '@mui/material';
import toast from 'react-hot-toast';
import { ChatContainer } from './ChatContainer';
import { QuickPrompts } from './QuickPrompts';
import { InputBox } from './InputBox';
import { useAuth } from '../../hooks/useAuth';
import { useWebSocket } from '../../hooks/useWebSocket';
import { STRINGS } from '../../constants/strings';
import { PING_INTERVAL_MS } from '../../constants/chat';
import { getChatSocketUrl } from '../../constants/api';
import { generateMessageId, loadChatHistory, saveChatHistory } from '../../utils/chat';
import type { ChatMessage, ClientFrame, ConnectionStatus, ServerFrame } from '../../types/chat';
import { coachPageStyles as styles } from './CoachPage.styles';

const S = STRINGS.coach;

const STATUS_CHIP_COLOR: Record<ConnectionStatus, 'success' | 'warning' | 'default'> = {
  open: 'success',
  connecting: 'warning',
  reconnecting: 'warning',
  closed: 'default',
};

export function CoachPage() {
  const { user } = useAuth();
  const userId = user?.id || null;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  // Tracks which assistant message is currently being filled by token frames.
  const streamingIdRef = useRef<string | null>(null);

  // Load this user's persisted history once we know who they are.
  useEffect(() => {
    // Deferred so the effect body itself schedules no state updates synchronously.
    queueMicrotask(() => {
      if (userId) setMessages(loadChatHistory(userId));
    });
  }, [userId]);

  // Persist after every change (skipped until a user id is known).
  useEffect(() => {
    if (userId) saveChatHistory(userId, messages);
  }, [userId, messages]);

  const handleFrame = useCallback((frame: ServerFrame) => {
    switch (frame.type) {
      case 'start': {
        const id = generateMessageId();
        streamingIdRef.current = id;
        setMessages((prev) => [
          ...prev,
          { id, role: 'assistant', content: '', status: 'streaming', timestamp: new Date().toISOString() },
        ]);
        break;
      }
      case 'token': {
        const id = streamingIdRef.current;
        if (!id) break;
        setMessages((prev) =>
          prev.map((m) => (m.id === id ? { ...m, content: m.content + frame.content } : m)),
        );
        break;
      }
      case 'done': {
        const id = streamingIdRef.current;
        streamingIdRef.current = null;
        if (!id) break;
        setMessages((prev) =>
          prev.map((m) => (m.id === id ? { ...m, content: frame.content, status: 'done' } : m)),
        );
        break;
      }
      case 'error': {
        const id = streamingIdRef.current;
        streamingIdRef.current = null;
        const content = frame.content || S.errors.streamError;
        if (id) {
          setMessages((prev) =>
            prev.map((m) => (m.id === id ? { ...m, content, status: 'error' } : m)),
          );
        } else {
          setMessages((prev) => [
            ...prev,
            {
              id: generateMessageId(),
              role: 'assistant',
              content,
              status: 'error',
              timestamp: new Date().toISOString(),
            },
          ]);
        }
        break;
      }
      // 'pong' and 'notification' frames need no chat-UI handling here.
      default:
        break;
    }
  }, []);

  const { status, send } = useWebSocket<ServerFrame, ClientFrame>({
    url: userId ? getChatSocketUrl(userId) : null,
    onMessage: handleFrame,
  });

  // Keepalive ping while connected, so idle proxies don't drop the socket.
  useEffect(() => {
    if (status !== 'open') return;
    const interval = window.setInterval(() => send({ type: 'ping' }), PING_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [status, send]);

  // Derived from state (not the ref) so render never reads `.current` directly.
  const isStreaming = messages.some((m) => m.status === 'streaming');
  const inputDisabled = status !== 'open' || isStreaming;

  function handleSend(content: string) {
    setMessages((prev) => [
      ...prev,
      {
        id: generateMessageId(),
        role: 'user',
        content,
        status: 'done',
        timestamp: new Date().toISOString(),
      },
    ]);
    const sent = send({ type: 'message', content });
    if (!sent) toast.error(S.errors.sendWhileOffline);
  }

  return (
    <Box sx={styles.root}>
      <Box sx={styles.headerRow}>
        <Box>
          <Typography variant="h5" sx={styles.title}>
            {S.title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {S.subtitle}
          </Typography>
        </Box>
        <Chip
          label={S.connection[status]}
          color={STATUS_CHIP_COLOR[status]}
          size="small"
          sx={styles.statusChip}
        />
      </Box>

      <Paper variant="outlined" sx={styles.card}>
        <ChatContainer messages={messages} />
        <Box sx={styles.footer}>
          <QuickPrompts onSelect={handleSend} disabled={inputDisabled} />
          <InputBox onSend={handleSend} disabled={inputDisabled} />
        </Box>
      </Paper>
    </Box>
  );
}
