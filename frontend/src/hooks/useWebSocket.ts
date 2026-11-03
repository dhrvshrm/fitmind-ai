import { useEffect, useRef, useState } from 'react';
import { RECONNECT_DELAYS_MS } from '../constants/chat';
import { WS_CLOSE_UNAUTHORIZED } from '../constants/api';
import type { ConnectionStatus } from '../types/chat';

type UseWebSocketOptions<TIncoming, TOutgoing> = {
  /** Socket URL, or `null` to stay disconnected (e.g. auth not ready yet). */
  url: string | null;
  /** Called with each parsed JSON frame received from the server. */
  onMessage: (frame: TIncoming) => void;
  /** Frame sent as soon as the socket opens (used to authenticate). */
  authFrame: TOutgoing | null;
  /** True for the frame confirming authentication; status becomes `open` then. */
  isReadyFrame: (frame: TIncoming) => boolean;
};

/**
 * Generic JSON WebSocket connection: connects when `url` is set, sends
 * `authFrame` on open, reports `open` once the server confirms with a ready
 * frame, and reconnects automatically (with backoff) if the socket drops for
 * any reason other than the component unmounting or a rejected login.
 *
 * Guards against React StrictMode's dev-mode double-invoke (mount -> cleanup ->
 * mount): `cancelled` is a plain closure variable scoped to one effect
 * execution (never a ref), so an earlier instance's cleanup can't be
 * "un-cancelled" by a later instance, and every socket handler double-checks
 * `socketRef.current === socket` before acting, so a stale socket's late
 * events are ignored once it's been superseded or closed.
 */
export function useWebSocket<TIncoming, TOutgoing = TIncoming>({
  url,
  onMessage,
  authFrame,
  isReadyFrame,
}: UseWebSocketOptions<TIncoming, TOutgoing>) {
  const [internalStatus, setInternalStatus] = useState<ConnectionStatus>('connecting');
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const attemptRef = useRef(0);
  const onMessageRef = useRef(onMessage);
  const authFrameRef = useRef(authFrame);
  const isReadyFrameRef = useRef(isReadyFrame);

  useEffect(() => {
    onMessageRef.current = onMessage;
    authFrameRef.current = authFrame;
    isReadyFrameRef.current = isReadyFrame;
  }, [onMessage, authFrame, isReadyFrame]);

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
        if (authFrameRef.current) socket.send(JSON.stringify(authFrameRef.current));
      };

      socket.onmessage = (event) => {
        if (socketRef.current !== socket) return;
        let frame: TIncoming;
        try {
          frame = JSON.parse(event.data) as TIncoming;
        } catch {
          return; // Ignore frames that aren't valid JSON.
        }
        if (isReadyFrameRef.current(frame)) {
          attemptRef.current = 0;
          setInternalStatus('open');
        }
        onMessageRef.current(frame);
      };

      socket.onclose = (event) => {
        if (socketRef.current !== socket) return;
        socketRef.current = null;
        if (cancelled) return;
        // A rejected token won't start working on retry; stay closed.
        if (event.code === WS_CLOSE_UNAUTHORIZED) {
          setInternalStatus('closed');
          return;
        }

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
