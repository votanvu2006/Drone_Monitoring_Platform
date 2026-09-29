import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MissionDetailPage } from './MissionDetailPage';

vi.mock('../components/MapView', () => ({ MapView: () => null }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

function MissionRouteControls() {
  const navigate = useNavigate();
  return <button onClick={() => navigate('/missions/8')}>Open mission 8</button>;
}

describe('MissionDetailPage polling', () => {
  it('loads flight zones once across renders instead of restarting the polling effect', async () => {
    const mission = {
      id: 7, missionCode: 'MSN-007', name: 'Test mission', drone: { id: 1, droneCode: 'DRN-001', displayName: 'Survey One' },
      status: 'READY', validationStatus: 'NOT_CHECKED', progressPercent: 0, estimatedDistanceM: 500, createdAt: '2026-09-01',
      description: null, validationMessage: null, plannedAltitudeM: 60, plannedSpeedMps: 8, estimatedDurationSec: 120,
      updatedAt: '2026-09-01', waypoints: [],
    };
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const path = String(input);
      if (path === '/api/missions/7') return new Response(JSON.stringify({ data: mission }), { status: 200 });
      if (path === '/api/flight-zones') return new Response(JSON.stringify({ type: 'FeatureCollection', features: [] }), { status: 200 });
      return new Response(JSON.stringify({ error: { message: 'Unexpected request' } }), { status: 404 });
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<MemoryRouter initialEntries={['/missions/7']}><Routes><Route path="/missions/:missionId" element={<MissionDetailPage />} /></Routes></MemoryRouter>);

    expect(await screen.findByRole('heading', { name: 'Test mission' })).toBeInTheDocument();
    await new Promise((resolve) => window.setTimeout(resolve, 50));
    expect(fetchMock.mock.calls.filter(([input]) => String(input) === '/api/flight-zones')).toHaveLength(1);
  });

  it('keeps an in-flight validation result scoped to the mission that started it', async () => {
    let resolveValidation: ((response: Response) => void) | undefined;
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const path = String(input);
      const missionId = Number(path.match(/\/api\/missions\/(\d+)/)?.[1]);
      if (path.endsWith('/validate')) {
        return new Promise<Response>((resolve) => { resolveValidation = resolve; });
      }
      if (missionId) {
        return new Response(JSON.stringify({ data: {
          id: missionId, missionCode: `MSN-${missionId}`, name: `Mission ${missionId}`,
          drone: { id: 1, droneCode: 'DRN-001', displayName: 'Survey One' },
          status: 'READY', validationStatus: 'NOT_CHECKED', progressPercent: 0, estimatedDistanceM: 500,
          createdAt: '2026-09-01', description: null, validationMessage: null, plannedAltitudeM: 60,
          plannedSpeedMps: 8, estimatedDurationSec: 120, updatedAt: '2026-09-01', waypoints: [],
        } }), { status: 200 });
      }
      if (path === '/api/flight-zones') return new Response(JSON.stringify({ type: 'FeatureCollection', features: [] }), { status: 200 });
      return new Response(JSON.stringify({ error: { message: 'Unexpected request' } }), { status: 404 });
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<MemoryRouter initialEntries={['/missions/7']}><Routes><Route path="/missions/:missionId" element={<><MissionRouteControls /><MissionDetailPage /></>} /></Routes></MemoryRouter>);

    expect(await screen.findByRole('heading', { name: 'Mission 7' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Run validation' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/missions/7/validate', expect.objectContaining({ method: 'POST' })));
    fireEvent.click(screen.getByRole('button', { name: 'Open mission 8' }));
    expect(await screen.findByRole('heading', { name: 'Mission 8' })).toBeInTheDocument();

    await act(async () => {
      resolveValidation?.(new Response(JSON.stringify({ data: { missionId: 7, validationStatus: 'VALID', message: 'Mission 7 validation result', violations: [] } }), { status: 200 }));
    });

    expect(screen.queryByText('Mission 7 validation result')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Run validation' })).toBeEnabled();
  });
});
