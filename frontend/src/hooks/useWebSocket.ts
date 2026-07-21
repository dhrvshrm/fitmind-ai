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
 */
export function useWebSocket<TIncoming, TOutgoing = TIncoming>({
  url,
  onMessage,
}: UseWebSocketOptions<TIncoming>) {
  const [status, setStatus] = useState<ConnectionStatus>('closed');
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const attemptRef = useRef(0);
  const onMessageRef = useRef(onMessage);
  // Set once the effect's cleanup runs, so a stale reconnect never fires after unmount.
  const closedByCleanupRef = useRef(false);

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    if (!url) {
      // Deferred so the effect body itself schedules no state updates synchronously.
      queueMicrotask(() => setStatus('closed'));
      return;
    }

    closedByCleanupRef.current = false;

    function clearReconnectTimer() {
      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    }

    function connect() {
      // Guards against a connect deferred via queueMicrotask/setTimeout firing
      // after this effect instance was already cleaned up.
      if (!url || closedByCleanupRef.current) return;
      setStatus(attemptRef.current === 0 ? 'connecting' : 'reconnecting');

      const socket = new WebSocket(url);
      socketRef.current = socket;

      socket.onopen = () => {
        attemptRef.current = 0;
        setStatus('open');
      };

      socket.onmessage = (event) => {
        try {
          onMessageRef.current(JSON.parse(event.data) as TIncoming);
        } catch {
          // Ignore frames that aren't valid JSON.
        }
      };

      socket.onclose = () => {
        socketRef.current = null;
        if (closedByCleanupRef.current) return;

        setStatus('reconnecting');
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

    // Deferred so the effect body itself schedules no state updates synchronously.
    queueMicrotask(connect);

    return () => {
      closedByCleanupRef.current = true;
      clearReconnectTimer();
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [url]);

  function send(data: TOutgoing): boolean {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return false;
    socket.send(JSON.stringify(data));
    return true;
  }

  return { status, send };
}
