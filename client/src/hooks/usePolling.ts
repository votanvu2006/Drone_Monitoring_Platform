import { useEffect, useRef, useState } from 'react';

export interface ResourceState<T> {
  data: T | null;
  error: Error | null;
  loading: boolean;
  refresh: () => void;
}

export function usePolling<T>(load: () => Promise<T>, intervalMs = 0): ResourceState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshToken, setRefreshToken] = useState(0);
  const requestInFlight = useRef(false);
  const queuedRun = useRef<(() => void) | null>(null);

  useEffect(() => {
    let active = true;
    let timer: number | undefined;
    setLoading(true);
    const run = async () => {
      if (!active) return;
      if (requestInFlight.current) {
        queuedRun.current = () => { void run(); };
        return;
      }

      requestInFlight.current = true;
      try {
        const result = await load();
        if (active) { setData(result); setError(null); }
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason : new Error('Request failed'));
      } finally {
        requestInFlight.current = false;
        if (active) setLoading(false);

        const nextRun = queuedRun.current;
        queuedRun.current = null;
        if (nextRun) nextRun();
        else if (active && intervalMs > 0) timer = window.setTimeout(() => { void run(); }, intervalMs);
      }
    };
    void run();
    return () => { active = false; if (timer !== undefined) window.clearTimeout(timer); };
  }, [load, intervalMs, refreshToken]);

  return { data, error, loading, refresh: () => setRefreshToken((token) => token + 1) };
}
