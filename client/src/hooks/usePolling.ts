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
  const requestSequence = useRef(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const run = async () => {
      const sequence = ++requestSequence.current;
      try {
        const result = await load();
        if (active && sequence === requestSequence.current) { setData(result); setError(null); }
      } catch (reason) {
        if (active && sequence === requestSequence.current) setError(reason instanceof Error ? reason : new Error('Request failed'));
      } finally {
        if (active && sequence === requestSequence.current) setLoading(false);
      }
    };
    void run();
    const timer = intervalMs > 0 ? window.setInterval(() => void run(), intervalMs) : undefined;
    return () => { active = false; if (timer !== undefined) window.clearInterval(timer); };
  }, [load, intervalMs, refreshToken]);

  return { data, error, loading, refresh: () => setRefreshToken((token) => token + 1) };
}
