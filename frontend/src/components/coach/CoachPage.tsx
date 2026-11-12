import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Box, Card, Chip, IconButton, Stack, Tooltip } from '@mui/material';
import { AddCommentRounded, DeleteSweepRounded, RestaurantMenuRounded } from '@mui/icons-material';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ChatContainer } from './ChatContainer';
import { QuickPrompts } from './QuickPrompts';
import { InputBox } from './InputBox';
import { MenuDialog } from './MenuDialog';
import { useAuth } from '../../hooks/useAuth';
import { useAppSocket } from '../../hooks/useAppSocket';
import {
  useCancelCoachAction,
  useClearCoachHistory,
  useCoachConversation,
  useConfirmCoachAction,
  useInvalidateCoachDomains,
  useMenuAdvice,
  useNewCoachChat,
} from '../../hooks/queries/useCoachQueries';
import { STRINGS } from '../../constants/strings';
import { COACH_STRINGS } from '../../constants/coachStrings';
import { QUERY_KEYS } from '../../constants/queryKeys';
import { PING_INTERVAL_MS } from '../../constants/chat';
import { resolveApiError } from '../../lib/apiClient';
import { clearLegacyChatHistory, generateMessageId, toChatMessage } from '../../utils/chat';
import type { ChatMessage, ConnectionStatus, ServerFrame } from '../../types/chat';
import type { CoachProposal, MenuAdviceRequest } from '../../types/coach';
import { PageHeader } from '../ui/PageHeader';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { coachPageStyles as styles } from './CoachPage.styles';

const S = STRINGS.coach;
const C = COACH_STRINGS;

const STATUS_CHIP_COLOR: Record<ConnectionStatus, 'success' | 'warning' | 'default'> = {
  open: 'success',
  connecting: 'warning',
  reconnecting: 'warning',
  closed: 'default',
};

function withProposal(messages: ChatMessage[], proposal: CoachProposal): ChatMessage[] {
  return messages.map((m) =>
    m.proposals?.some((p) => p.id === proposal.id)
      ? { ...m, proposals: m.proposals.map((p) => (p.id === proposal.id ? proposal : p)) }
      : m,
  );
}

export function CoachPage() {
  const { user } = useAuth();
  const userId = user?.id || null;
  const queryClient = useQueryClient();

  const conversation = useCoachConversation(Boolean(userId));
  const newChat = useNewCoachChat();
  const clearHistory = useClearCoachHistory();
  const confirmAction = useConfirmCoachAction();
  const cancelAction = useCancelCoachAction();
  const menuAdvice = useMenuAdvice();
  const invalidateDomains = useInvalidateCoachDomains();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [busyProposalId, setBusyProposalId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  // Tracks which assistant message is currently being filled by token frames.
  const streamingIdRef = useRef<string | null>(null);

  // Show the stored conversation whenever the server copy (re)loads or is replaced.
  useEffect(() => {
    const data = conversation.data;
    if (!data) return;
    // Deferred so the effect body itself schedules no state updates synchronously.
    queueMicrotask(() => setMessages(data.messages.map(toChatMessage)));
  }, [conversation.data]);

  useEffect(() => {
    if (userId) clearLegacyChatHistory(userId);
  }, [userId]);

  const handleFrame = useCallback(
    (frame: ServerFrame) => {
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
            prev.map((m) =>
              m.id === id
                ? {
                    ...m,
                    id: frame.message_id ?? m.id,
                    content: frame.content,
                    status: 'done',
                    proposals: frame.proposals ?? [],
                  }
                : m,
            ),
          );
          break;
        }
        case 'invalidate': {
          void invalidateDomains(frame.domains);
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
    },
    [invalidateDomains],
  );

  const { status, send } = useAppSocket(handleFrame);

  // Keepalive ping while connected, so idle proxies don't drop the socket.
  useEffect(() => {
    if (status !== 'open') return;
    const interval = window.setInterval(() => send({ type: 'ping' }), PING_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [status, send]);

  // Derived from state (not the ref) so render never reads `.current` directly.
  const isStreaming = messages.some((m) => m.status === 'streaming');
  const inputDisabled = status !== 'open' || isStreaming || conversation.isLoading;
  const historyBusy = newChat.isPending || clearHistory.isPending;

  function handleSend(content: string) {
    setMessages((prev) => [
      ...prev,
      { id: generateMessageId(), role: 'user', content, status: 'done', timestamp: new Date().toISOString() },
    ]);
    const sent = send({ type: 'message', content });
    if (!sent) toast.error(S.errors.sendWhileOffline);
  }

  function refreshConversation() {
    void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.coach.conversation });
  }

  function handleConfirm(proposal: CoachProposal) {
    setBusyProposalId(proposal.id);
    confirmAction.mutate(proposal.id, {
      onSuccess: (result) => {
        setMessages((prev) => [...withProposal(prev, result.proposal), toChatMessage(result.message)]);
        if (result.proposal.status === 'failed') toast.error(result.message.content);
      },
      onError: (error) => {
        toast.error(resolveApiError(error, C.action.confirmError));
        refreshConversation();
      },
      onSettled: () => setBusyProposalId(null),
    });
  }

  function handleDismiss(proposal: CoachProposal) {
    setBusyProposalId(proposal.id);
    cancelAction.mutate(proposal.id, {
      onSuccess: (result) => setMessages((prev) => withProposal(prev, result.proposal)),
      onError: (error) => {
        toast.error(resolveApiError(error, C.action.cancelError));
        refreshConversation();
      },
      onSettled: () => setBusyProposalId(null),
    });
  }

  function handleMenu(request: MenuAdviceRequest) {
    menuAdvice.mutate(request, {
      onSuccess: (advice) => {
        setMessages((prev) => [...prev, toChatMessage(advice.user_message), toChatMessage(advice.message)]);
        setMenuOpen(false);
        menuAdvice.reset();
      },
    });
  }

  function handleNewChat() {
    newChat.mutate(undefined, { onError: () => toast.error(C.history.newChatError) });
  }

  function handleClear() {
    clearHistory.mutate(undefined, {
      onSuccess: () => {
        setClearOpen(false);
        toast.success(C.history.cleared);
      },
      onError: () => toast.error(C.history.clearError),
    });
  }

  return (
    <Box sx={styles.root}>
      <PageHeader
        title={S.title}
        subtitle={S.subtitle}
        actions={
          <Stack sx={styles.headerActions}>
            <Chip
              label={S.connection[status]}
              color={STATUS_CHIP_COLOR[status]}
              variant="outlined"
              size="small"
              sx={styles.statusChip}
            />
            <Tooltip title={C.header.menu}>
              <span>
                <IconButton aria-label={C.header.menu} onClick={() => setMenuOpen(true)} disabled={isStreaming}>
                  <RestaurantMenuRounded />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title={C.header.newChat}>
              <span>
                <IconButton
                  aria-label={C.header.newChat}
                  onClick={handleNewChat}
                  disabled={historyBusy || isStreaming || messages.length === 0}
                >
                  <AddCommentRounded />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title={C.header.clearHistory}>
              <span>
                <IconButton
                  aria-label={C.header.clearHistory}
                  onClick={() => setClearOpen(true)}
                  disabled={historyBusy || isStreaming || messages.length === 0}
                >
                  <DeleteSweepRounded />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
        }
      />

      <Card sx={styles.card}>
        {conversation.isError && (
          <Alert severity="warning" sx={styles.alert}>
            {C.history.loadError}
          </Alert>
        )}
        <ChatContainer
          messages={messages}
          busyProposalId={busyProposalId}
          onConfirm={handleConfirm}
          onDismiss={handleDismiss}
        />
        <Box sx={styles.footer}>
          <QuickPrompts onSelect={handleSend} disabled={inputDisabled} />
          <InputBox onSend={handleSend} disabled={inputDisabled} />
        </Box>
      </Card>

      <MenuDialog
        open={menuOpen}
        loading={menuAdvice.isPending}
        error={menuAdvice.error}
        onSubmit={handleMenu}
        onClose={() => {
          setMenuOpen(false);
          menuAdvice.reset();
        }}
      />
      <ConfirmDialog
        open={clearOpen}
        title={C.history.clearTitle}
        description={C.history.clearBody}
        confirmLabel={C.history.clearConfirm}
        destructive
        loading={clearHistory.isPending}
        onConfirm={handleClear}
        onClose={() => setClearOpen(false)}
      />
    </Box>
  );
}
