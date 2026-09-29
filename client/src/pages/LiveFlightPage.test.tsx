import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LiveFlightPage } from './LiveFlightPage';

vi.mock('../components/MapView', () => ({ MapView: () => null }));
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('LiveFlightPage', () => {
  it('paginates session choices beyond page one and filters sessions by aircraft', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input), 'http://localhost');
      if (url.pathname === '/api/drones') {
        const page = Number(url.searchParams.get('page') || 1);
        const count = page === 1 ? 100 : 1;
        const data = Array.from({ length: count }, (_, index) => {
          const id = (page - 1) * 100 + index + 1;
          return { id, droneCode: `DRN-${String(id).padStart(3, '0')}`, displayName: `Survey ${id}`, status: 'AVAILABLE' };
        });
        return new Response(JSON.stringify({ data, page, pageSize: 100, total: 101 }), { status: 200 });
      }
      if (url.pathname === '/api/flights') {
        const page = Number(url.searchParams.get('page') || 1);
        const droneId = Number(url.searchParams.get('droneId') || 1);
        const total = url.searchParams.has('droneId') ? 1 : 21;
        const from = (page - 1) * 20;
        const count = Math.max(0, Math.min(20, total - from));
        const data = Array.from({ length: count }, (_, index) => {
          const id = from + index + 1;
          return { id, flightCode: `FLT-${String(id).padStart(3, '0')}`, status: 'ABORTED', result: 'FAILED', drone: { id: droneId, droneCode: `DRN-00${droneId}`, displayName: `Survey ${droneId === 1 ? 'One' : 'Two'}` }, mission: { id: 5, missionCode: 'MSN-005', name: 'Survey Mission' }, scenarioCode: 'NORMAL', startedAt: null, endedAt: null, durationSec: 45, distanceM: 200 };
        });
        return new Response(JSON.stringify({ data, page, pageSize: 20, total }), { status: 200 });
      }
      if (/\/api\/flights\/\d+\/simulation\/status/.test(url.pathname)) {
        const id = Number(url.pathname.split('/')[3]);
        return new Response(JSON.stringify({ data: { flight: { id, flight_code: `FLT-${String(id).padStart(3, '0')}`, status: 'ABORTED', result: 'FAILED', mission_id: 5, drone_id: 1, preflight_weather_recommendation: 'SAFE', weather_acknowledged_at: null, started_at: null, ended_at: '2026-09-28 10:00:00', duration_sec: 45, distance_m: 200 }, latestTelemetry: null, timerActive: false } }), { status: 200 });
      }
      if (url.pathname === '/api/flight-zones') return new Response(JSON.stringify({ type: 'FeatureCollection', features: [] }), { status: 200 });
      if (url.pathname === '/api/missions/5') return new Response(JSON.stringify({ error: { message: 'No route' } }), { status: 404 });
      return new Response(JSON.stringify({ data: [], page: 1, pageSize: 20, total: 0 }), { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<MemoryRouter initialEntries={['/live-flight']}><LiveFlightPage /></MemoryRouter>);

    expect(await screen.findByText('FLT-001')).toBeInTheDocument();
    expect(await screen.findByRole('option', { name: 'Survey 101' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/flights?page=2&pageSize=20', expect.any(Object)));
    fireEvent.change(screen.getByRole('combobox', { name: 'MONITOR SESSION' }), { target: { value: '21' } });
    expect(await screen.findByText('FLT-021')).toBeInTheDocument();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/flights/21/simulation/status', expect.any(Object)));

    fireEvent.change(screen.getByRole('combobox', { name: 'AIRCRAFT' }), { target: { value: '2' } });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/flights?page=1&pageSize=20&droneId=2', expect.any(Object)));
    expect(await screen.findByText('FLT-001')).toBeInTheDocument();
  });
});
