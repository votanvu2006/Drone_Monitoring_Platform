import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FlightHistoryPage } from './FlightHistoryPage';

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('FlightHistoryPage', () => {
  it('combines every LANDED and ABORTED page before applying search and table pagination', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input), 'http://localhost');
      if (url.pathname.endsWith('/drones')) {
        const page = Number(url.searchParams.get('page') || 1);
        const data = page === 1
          ? Array.from({ length: 100 }, (_, index) => ({ id: index + 1, droneCode: `DRN-${String(index + 1).padStart(3, '0')}`, displayName: `Drone ${index + 1}` }))
          : [{ id: 101, droneCode: 'DRN-101', displayName: 'Drone 101' }];
        return new Response(JSON.stringify({ data, page, pageSize: 100, total: 101 }), { status: 200 });
      }
      const status = url.searchParams.get('status') || 'LANDED';
      const page = Number(url.searchParams.get('page') || 1);
      const total = status === 'ABORTED' ? 102 : 101;
      const offset = (page - 1) * 100;
      const count = Math.max(0, Math.min(100, total - offset));
      const data = Array.from({ length: count }, (_, index) => {
        const sequence = offset + index + 1;
        return {
          id: (status === 'ABORTED' ? 1000 : 0) + sequence,
          flightCode: `${status}-${String(sequence).padStart(3, '0')}`,
          status,
          result: status === 'ABORTED' ? 'FAILED' : 'SUCCESS',
          drone: { id: 1, droneCode: 'DRN-001', displayName: 'Survey Drone' },
          mission: { id: 1, missionCode: 'MSN-001', name: 'Survey Mission' },
          scenarioCode: 'NORMAL',
          startedAt: '2026-09-01 10:00:00',
          endedAt: new Date(Date.UTC(2026, 0, 1, 0, 0, sequence)).toISOString(),
          durationSec: 60,
          distanceM: 120,
        };
      });
      return new Response(JSON.stringify({ data, page, pageSize: 100, total }), { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<FlightHistoryPage />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('status=ABORTED&page=2'), expect.any(Object)));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/drones?page=2&pageSize=100', expect.any(Object)));
    expect(screen.getByRole('option', { name: 'Drone 101 · DRN-101' })).toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox', { name: 'Filter flights by aircraft' }), { target: { value: '101' } });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('droneId=101'), expect.any(Object)));
    fireEvent.change(screen.getByRole('textbox', { name: 'Search flight history' }), { target: { value: 'ABORTED-101' } });
    expect(await screen.findByText('ABORTED-101')).toBeInTheDocument();
    expect(screen.getByText(/across all backend pages/)).toBeInTheDocument();
  });
});
