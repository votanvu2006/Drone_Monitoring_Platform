import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('operations console', () => {
  it('renders a status-neutral overview from live fleet records', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const path = String(input);
      if (path.includes('/health')) return new Response(JSON.stringify({ status: 'ok' }), { status: 200 });
      if (path.includes('/drones')) return new Response(JSON.stringify({
        data: [{
          id: 1, droneCode: 'DRN-001', displayName: 'Test quadcopter', status: 'AVAILABLE', isSimulated: true,
          model: { modelCode: 'Q-1', manufacturer: 'Northstar', modelName: 'Survey One' },
          homeLocation: { label: 'Hangar A', latitude: 21, longitude: 105 }, lastKnownLocation: null,
        }, {
          id: 2, droneCode: 'DRN-002', displayName: 'Second quadcopter', status: 'OFFLINE', isSimulated: true,
          model: { modelCode: 'Q-1', manufacturer: 'Northstar', modelName: 'Survey One' },
          homeLocation: { label: 'Hangar B', latitude: 21, longitude: 105 }, lastKnownLocation: null,
        }], page: 1, pageSize: 100, total: 2,
      }), { status: 200 });
      return new Response(JSON.stringify({ data: [], page: 1, pageSize: 100, total: 0 }), { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<MemoryRouter><App /></MemoryRouter>);

    expect(await screen.findByRole('heading', { name: 'Welcome back, operator' })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: /Fleet overview operations, in focus/ })).toBeInTheDocument();
    expect(screen.getByText(/2 aircraft · 1 available · 0 in flight · 1 maintenance or offline/)).toBeInTheDocument();
    expect(screen.queryByText(/ready for flight/i)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /View fleet/ })).toHaveAttribute('href', '/drones');
    expect(fetchMock).toHaveBeenCalledWith('/api/drones?page=1&pageSize=100', expect.any(Object));
  });

  it('counts the full fleet and finds an active flight beyond the first page', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input), 'http://localhost');
      if (url.pathname === '/api/health') return new Response(JSON.stringify({ status: 'ok' }), { status: 200 });
      if (url.pathname === '/api/drones') {
        const page = Number(url.searchParams.get('page') || 1);
        const count = page === 1 ? 100 : 1;
        const data = Array.from({ length: count }, (_, index) => {
          const id = (page - 1) * 100 + index + 1;
          return { id, droneCode: `DRN-${id}`, displayName: `Drone ${id}`, status: page === 1 ? 'AVAILABLE' : 'IN_FLIGHT' };
        });
        return new Response(JSON.stringify({ data, page, pageSize: 100, total: 101 }), { status: 200 });
      }
      if (url.pathname === '/api/flights' && url.searchParams.get('status') === 'FLYING') {
        const page = Number(url.searchParams.get('page') || 1);
        const count = page === 1 ? 100 : 1;
        const data = Array.from({ length: count }, (_, index) => {
          const id = (page - 1) * 100 + index + 1;
          return {
            id, flightCode: `FLIGHT-${id}`, status: 'FLYING', result: null,
            drone: { id: 1, droneCode: 'DRN-001', displayName: 'Drone 1' },
            mission: { id: 1, missionCode: 'MSN-001', name: 'Survey mission' },
            scenarioCode: 'NORMAL', startedAt: '2026-09-29 10:00:00', endedAt: null, durationSec: 60, distanceM: 120,
          };
        });
        return new Response(JSON.stringify({ data, page, pageSize: 100, total: 101 }), { status: 200 });
      }
      if (url.pathname === '/api/flights') return new Response(JSON.stringify({ data: [], page: 1, pageSize: 4, total: 0 }), { status: 200 });
      if (url.pathname === '/api/alerts' || url.pathname === '/api/missions') return new Response(JSON.stringify({ data: [], page: 1, pageSize: 5, total: 0 }), { status: 200 });
      return new Response(JSON.stringify({ data: [], page: 1, pageSize: 100, total: 0 }), { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<MemoryRouter><App /></MemoryRouter>);

    expect(await screen.findByText(/101 aircraft · 100 available · 1 in flight · 0 maintenance or offline/)).toBeInTheDocument();
    expect(await screen.findByText('FLIGHT-101')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/drones?page=2&pageSize=100', expect.any(Object));
    expect(fetchMock).toHaveBeenCalledWith('/api/flights?status=FLYING&page=2&pageSize=100', expect.any(Object));
  });

  it('shows every drone on the aircraft page and links monitoring to that aircraft', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const path = String(input);
      if (path.includes('/drones')) return new Response(JSON.stringify({ data: [
        { id: 1, droneCode: 'DRN-001', displayName: 'First quadcopter', status: 'AVAILABLE', isSimulated: true, model: { modelCode: 'Q-1', manufacturer: 'Northstar', modelName: 'Survey One' }, homeLocation: { label: 'Hangar A', latitude: 21, longitude: 105 }, lastKnownLocation: null },
        { id: 2, droneCode: 'DRN-002', displayName: 'Second quadcopter', status: 'OFFLINE', isSimulated: false, model: { modelCode: 'Q-2', manufacturer: 'Northstar', modelName: 'Survey Two' }, homeLocation: { label: 'Hangar B', latitude: 22, longitude: 106 }, lastKnownLocation: null },
      ], page: 1, pageSize: 10, total: 2 }), { status: 200 });
      return new Response(JSON.stringify({ data: [], page: 1, pageSize: 10, total: 0 }), { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<MemoryRouter initialEntries={['/drones']}><App /></MemoryRouter>);

    expect(await screen.findByRole('heading', { name: 'First quadcopter' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Second quadcopter' })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /Monitor/ }).map((link) => link.getAttribute('href'))).toEqual(['/live-flight?droneId=1', '/live-flight?droneId=2']);
  });
});
