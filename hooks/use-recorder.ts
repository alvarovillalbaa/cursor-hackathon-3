"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type RecorderStatus =
  | "idle"
  | "requesting"
  | "ready"
  | "recording"
  | "recorded"
  | "denied"
  | "unsupported"
  | "error";

interface UseRecorderOptions {
  maxMs?: number;
}

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  const candidates = [
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
    "video/mp4",
  ];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type));
}

// Wraps getUserMedia + MediaRecorder with a max-duration auto-stop, live
// preview stream, and recorded Blob + object URL. Handles permission/support
// failure states so the UI can guide the user.
export function useRecorder({ maxMs = 8000 }: UseRecorderOptions = {}) {
  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const rafRef = useRef<number | null>(null);
  const autoStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTsRef = useRef(0);
  const streamRef = useRef<MediaStream | null>(null);

  const clearTimers = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (autoStopRef.current) clearTimeout(autoStopRef.current);
    rafRef.current = null;
    autoStopRef.current = null;
  }, []);

  const requestCamera = useCallback(async () => {
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      setStatus("unsupported");
      return;
    }
    setStatus("requesting");
    setError(null);
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 } },
        audio: false,
      });
      streamRef.current = media;
      setStream(media);
      setStatus("ready");
    } catch (err) {
      const name = (err as { name?: string })?.name;
      if (name === "NotAllowedError" || name === "SecurityError") {
        setStatus("denied");
      } else {
        setStatus("error");
        setError(err instanceof Error ? err.message : "Camera unavailable");
      }
    }
  }, []);

  const stop = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
  }, []);

  const start = useCallback(() => {
    const media = streamRef.current;
    if (!media) return;
    chunksRef.current = [];
    const mimeType = pickMimeType();
    const recorder = new MediaRecorder(
      media,
      mimeType ? { mimeType } : undefined
    );

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };
    recorder.onstop = () => {
      clearTimers();
      const blob = new Blob(chunksRef.current, {
        type: recorder.mimeType || "video/webm",
      });
      setVideoBlob(blob);
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(blob);
      });
      setStatus("recorded");
    };

    recorderRef.current = recorder;
    recorder.start();
    startTsRef.current = performance.now();
    setElapsedMs(0);
    setStatus("recording");

    const tickElapsed = () => {
      setElapsedMs(performance.now() - startTsRef.current);
      rafRef.current = requestAnimationFrame(tickElapsed);
    };
    rafRef.current = requestAnimationFrame(tickElapsed);
    autoStopRef.current = setTimeout(stop, maxMs);
  }, [clearTimers, maxMs, stop]);

  const reset = useCallback(() => {
    clearTimers();
    setVideoBlob(null);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setElapsedMs(0);
    setStatus(streamRef.current ? "ready" : "idle");
  }, [clearTimers]);

  // Tear down camera + timers on unmount.
  useEffect(() => {
    return () => {
      clearTimers();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    };
  }, [clearTimers]);

  return {
    status,
    stream,
    videoBlob,
    previewUrl,
    error,
    elapsedMs,
    maxMs,
    requestCamera,
    start,
    stop,
    reset,
  };
}
