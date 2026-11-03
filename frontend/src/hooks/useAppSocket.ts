import { useMemo } from 'react';
import { useAuth } from './useAuth';
import { useWebSocket } from './useWebSocket';
import { getChatSocketUrl } from '../constants/api';
import { isReadyFrame } from '../utils/chat';
import type { ClientFrame, ServerFrame } from '../types/chat';

/**
 * The app's authenticated WebSocket (`/ws`) for coach chat and live
 * notifications. Connects only while logged in and authenticates with the
 * session token in the first frame.
 */
export function useAppSocket(onMessage: (frame: ServerFrame) => void) {
  const { token } = useAuth();
  const authFrame = useMemo<ClientFrame | null>(
    () => (token ? { type: 'auth', token } : null),
    [token],
  );

  return useWebSocket<ServerFrame, ClientFrame>({
    url: token ? getChatSocketUrl() : null,
    onMessage,
    authFrame,
    isReadyFrame,
  });
}
