import { useEffect, useRef, useState } from 'react';
import { RECONNECT_DELAYS_MS } from '../constants/chat';
import type { ConnectionStatus } from '../types/chat';

type UseWebSocketOptions<TIncoming> = {
  /** Socket URL, or `null` to stay disconnected (e.g. auth not ready yet). */
  url: string | null;
  /** Called with each parsed JSON frame received from the server. */
  onMessage: (frame: TIncoming) => void;
};

/**
 * Generic JSON WebSocket connection: connects when `url` is set, exposes the
 * live connection status, and reconnects automatically (with backoff) if the
 * socket drops for any reason other than the component unmounting.
 *
 * Guards against React StrictMode's dev-mode double-invoke (mount → cleanup →
 * mount): `cancelled` is a plain closure variable scoped to one effect
 * execution (never a ref), so an earlier instance's cleanup can't be
 * "un-cancelled" by a later instance, and every socket handler double-checks
 * `socketRef.current === socket` before acting, so a stale socket's late
 * events are ignored once it's been superseded or closed.
 */
export function useWebSocket<TIncoming, TOutgoing = TIncoming>({
  url,
  onMessage,
}: UseWebSocketOptions<TIncoming>) {
  const [internalStatus, setInternalStatus] = useState<ConnectionStatus>('connecting');
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const attemptRef = useRef(0);
  const onMessageRef = useRef(onMessage);

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    if (!url) return;

    let cancelled = false;

    function clearReconnectTimer() {
      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    }

    function connect() {
      if (cancelled || !url) return;
      setInternalStatus(attemptRef.current === 0 ? 'connecting' : 'reconnecting');

      const socket = new WebSocket(url);
      socketRef.current = socket;

      socket.onopen = () => {
        if (socketRef.current !== socket) return;
        attemptRef.current = 0;
        setInternalStatus('open');
      };

      socket.onmessage = (event) => {
        if (socketRef.current !== socket) return;
        try {
          onMessageRef.current(JSON.parse(event.data) as TIncoming);
        } catch {
          // Ignore frames that aren't valid JSON.
        }
      };

      socket.onclose = () => {
        if (socketRef.current !== socket) return;
        socketRef.current = null;
        if (cancelled) return;

        setInternalStatus('reconnecting');
        const delay =
          RECONNECT_DELAYS_MS[Math.min(attemptRef.current, RECONNECT_DELAYS_MS.length - 1)];
        attemptRef.current += 1;
        clearReconnectTimer();
        reconnectTimerRef.current = window.setTimeout(connect, delay);
      };

      socket.onerror = () => {
        // The browser follows this with a close event, which drives reconnection.
        socket.close();
      };
    }

    connect();

    return () => {
      cancelled = true;
      clearReconnectTimer();
      const socket = socketRef.current;
      socketRef.current = null;
      socket?.close();
    };
  }, [url]);

  function send(data: TOutgoing): boolean {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return false;
    socket.send(JSON.stringify(data));
    return true;
  }

  // `internalStatus` only tracks a real socket's lifecycle; while `url` is
  // null there's nothing connecting, so the exposed status is forced to
  // 'closed' here rather than via a setState call inside the effect above.
  const status: ConnectionStatus = url ? internalStatus : 'closed';
  return { status, send };
}
