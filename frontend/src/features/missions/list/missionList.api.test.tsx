    import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import MissionListPage from './MissionListPage';
import { missionListDataSource } from './missionList.data';

function reply(body: unknown) {
  return {
    ok: true,
    status: 200,
    json: async () => body,
  };
}

const mission = {
  missionCode: 'mission-002',
  name: 'Mission 002',
  drone: { droneCode: 'DRONE-002' },
  status: 'WARNING',
  waypointCount: 8,
  createdAt: '2026-10-21 01:00:00',
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Missions API page', () => {
  it('maps the server mission and displays its status and waypoint count', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      reply({ data: [mission], total: 1 }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const mapped = await missionListDataSource.loadMissions();

    expect(mapped).toEqual([{
      id: 'mission-002',
      name: 'Mission 002',
      droneCode: 'DRONE-002',
      status: 'WARNING',
      waypointCount: 8,
      createdAt: '2026-10-21T01:00:00.000Z',
    }]);
    expect(fetchMock.mock.calls[0]?.[0])
      .toBe('/api/missions?page=1&pageSize=100');

    render(<MissionListPage />);

    expect(await screen.findByText('Mission 002')).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'DRONE-002' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '8' })).toBeInTheDocument();
  });

  it('shows a server error without falling back to snapshot missions', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('Connection unavailable')),
    );

    render(<MissionListPage />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Unable to load missions',
    );
    expect(screen.queryByText('Mission 001')).not.toBeInTheDocument();
  });

  it('shows the empty state when the server returns no missions', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(reply({ data: [], total: 0 })),
    );

    render(<MissionListPage />);

    expect(await screen.findByText('No missions found')).toBeInTheDocument();
  });
});