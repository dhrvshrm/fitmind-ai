import { useCallback, useEffect, useRef, useState } from 'react';
import { STRINGS } from '../constants/strings';
import type { RecordingStatus } from '../types/voiceCheckin';

const S = STRINGS.voiceCheckin.recorder;

/** Preferred container; falls back to the browser default when unsupported. */
const PREFERRED_MIME = 'audio/webm';

function permissionMessage(error: unknown): string {
  if (error instanceof DOMException) {
    if (error.name === 'NotAllowedError' || error.name === 'SecurityError') {
      return S.permissionDenied;
    }
    if (error.name === 'NotFoundError' || error.name === 'OverconstrainedError') {
      return S.noMicrophone;
    }
  }
  return S.error;
}

/**
 * MediaRecorder wrapper: exposes recording status, a live duration counter,
 * and permission-aware error messages.
 *
 * `stopRecording` resolves with the recorded audio blob once the recorder
 * flushes its final chunk.
 */
export function useVoiceRecording() {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  const [status, setStatus] = useState<RecordingStatus>('idle');
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const cleanupTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  /** Stops mic tracks so the browser's "recording" indicator turns off. */
  const releaseStream = useCallback(() => {
    recorderRef.current?.stream.getTracks().forEach((track) => track.stop());
  }, []);

  const startRecording = useCallback(async () => {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError(S.notSupported);
      return;
    }

    setStatus('requesting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported(PREFERRED_MIME)
        ? PREFERRED_MIME
        : undefined;
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);

      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorderRef.current = recorder;
      recorder.start();
      setDuration(0);
      timerRef.current = window.setInterval(
        () => setDuration((seconds) => seconds + 1),
        1000,
      );
      setStatus('recording');
    } catch (err) {
      setStatus('idle');
      setError(permissionMessage(err));
    }
  }, []);

  const stopRecording = useCallback((): Promise<Blob | null> => {
    const recorder = recorderRef.current;
    cleanupTimer();

    if (!recorder || recorder.state === 'inactive') {
      setStatus('idle');
      return Promise.resolve(null);
    }

    return new Promise((resolve) => {
      recorder.onstop = () => {
        releaseStream();
        setStatus('idle');
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || PREFERRED_MIME,
        });
        resolve(blob.size > 0 ? blob : null);
      };
      recorder.stop();
    });
  }, [cleanupTimer, releaseStream]);

  // Abandon any in-flight recording on unmount.
  useEffect(() => {
    return () => {
      cleanupTimer();
      releaseStream();
    };
  }, [cleanupTimer, releaseStream]);

  return { status, duration, error, startRecording, stopRecording };
}
