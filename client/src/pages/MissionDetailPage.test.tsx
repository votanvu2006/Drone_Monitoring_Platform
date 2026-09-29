import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MissionDetailPage } from './MissionDetailPage';

vi.mock('../components/MapView', () => ({ MapView: () => null }));
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

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
});
