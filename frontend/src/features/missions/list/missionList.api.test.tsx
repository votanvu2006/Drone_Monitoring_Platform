import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { missionListDataSource } from './missionList.data';
import MissionListPage from './MissionListPage';

const serverMission = { missionCode: 'mission-server', name: 'API mission', drone: { droneCode: 'DRONE-SERVER' }, status: 'WARNING', waypointCount: 3, createdAt: '2026-11-07 01:02:03' };
const response = (data: unknown, total = 1) => new Response(JSON.stringify({ data, total }));

describe('current missions API', () => {
  it('loads every page and maps the server mission code, waypoints and UTC time', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(response([serverMission], 2))
      .mockResolvedValueOnce(response([{ ...serverMission, missionCode: 'mission-next' }], 2));
    expect(await missionListDataSource.loadMissions()).toEqual([
      { id: 'mission-server', name: 'API mission', droneCode: 'DRONE-SERVER', status: 'WARNING', waypointCount: 3, createdAt: '2026-11-07T01:02:03.000Z' },
      { id: 'mission-next', name: 'API mission', droneCode: 'DRONE-SERVER', status: 'WARNING', waypointCount: 3, createdAt: '2026-11-07T01:02:03.000Z' },
    ]);
    expect(fetch).toHaveBeenNthCalledWith(1, '/api/missions?isCurrent=true&page=1&pageSize=100', expect.any(Object));
    expect(fetch).toHaveBeenNthCalledWith(2, '/api/missions?isCurrent=true&page=2&pageSize=100', expect.any(Object));
  });

  it('renders server missions without exposing bundled offline missions', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(response([serverMission]));
    render(<MissionListPage />);
    expect(await screen.findByRole('table')).toHaveTextContent('API mission');
    expect(screen.getByRole('table')).toHaveTextContent('DRONE-SERVER');
    expect(screen.queryByText('DRONE-001')).not.toBeInTheDocument();
  });

  it('shows loading and an empty R5 response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(response([], 0));
    render(<MissionListPage />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading missions');
    expect(await screen.findByText(/No missions/)).toBeVisible();
    expect(screen.queryByText('DRONE-002')).not.toBeInTheDocument();
  });

  it('shows API failure without a snapshot fallback', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network unavailable'));
    render(<MissionListPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load missions');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});
