"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { fetchState } from "@/lib/client/api";
import type { GameState } from "@/lib/types";

interface UseGameStateOptions {
  intervalMs?: number;
  enabled?: boolean;
}

// Polls GET /state on an interval, pausing while the tab is hidden and
// refetching immediately when it becomes visible again.
export function useGameState(
  code: string | null,
  { intervalMs = 1500, enabled = true }: UseGameStateOptions = {}
) {
  const [state, setState] = useState<GameState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const tick = useCallback(async () => {
    if (!code) return;
    try {
      const next = await fetchState(code);
      setState(next);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load game");
    } finally {
      setLoading(false);
    }
  }, [code]);

  const refresh = useCallback(() => tick(), [tick]);

  useEffect(() => {
    if (!code || !enabled) return;
    let cancelled = false;

    const loop = async () => {
      if (cancelled) return;
      if (typeof document !== "undefined" && document.hidden) {
        timer.current = setTimeout(loop, intervalMs);
        return;
      }
      await tick();
      if (cancelled) return;
      timer.current = setTimeout(loop, intervalMs);
    };

    const onVisible = () => {
      if (!document.hidden) tick();
    };

    loop();
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      if (timer.current) clearTimeout(timer.current);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [code, enabled, intervalMs, tick]);

  return { state, error, loading, refresh };
}
