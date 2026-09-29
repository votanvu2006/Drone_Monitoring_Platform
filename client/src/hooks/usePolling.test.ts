import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { usePolling } from './usePolling';

afterEach(() => { vi.restoreAllMocks(); });

describe('usePolling', () => {
  it('waits for a pending request before scheduling the next poll', async () => {
    const resolvers: ((value: string) => void)[] = [];
    const load = vi.fn(() => new Promise<string>((resolve) => { resolvers.push(resolve); }));

    const { result } = renderHook(() => usePolling(load, 20));

    await waitFor(() => expect(load).toHaveBeenCalledTimes(1));
    await new Promise((resolve) => window.setTimeout(resolve, 60));
    expect(load).toHaveBeenCalledTimes(1);

    resolvers[0]?.('first response');
    await waitFor(() => expect(load).toHaveBeenCalledTimes(2));
    expect(result.current.data).toBe('first response');
  });
});
