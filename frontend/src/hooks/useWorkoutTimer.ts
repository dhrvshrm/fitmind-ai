import { useCallback, useEffect, useRef, useState } from 'react';

export type TimerStatus = 'idle' | 'running' | 'paused';

/**
 * Workout session timer: start/pause/resume/reset with elapsed seconds.
 * The interval is cleaned up automatically on unmount.
 */
export function useWorkoutTimer() {
  const intervalRef = useRef<number | null>(null);
  const [status, setStatus] = useState<TimerStatus>('idle');
  const [seconds, setSeconds] = useState(0);

  const clear = useCallback(() => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const tick = useCallback(() => {
    clear();
    intervalRef.current = window.setInterval(
      () => setSeconds((value) => value + 1),
      1000,
    );
  }, [clear]);

  const start = useCallback(() => {
    setSeconds(0);
    setStatus('running');
    tick();
  }, [tick]);

  const pause = useCallback(() => {
    clear();
    setStatus('paused');
  }, [clear]);

  const resume = useCallback(() => {
    setStatus('running');
    tick();
  }, [tick]);

  const reset = useCallback(() => {
    clear();
    setStatus('idle');
    setSeconds(0);
  }, [clear]);

  useEffect(() => clear, [clear]);

  return { status, seconds, start, pause, resume, reset };
}
