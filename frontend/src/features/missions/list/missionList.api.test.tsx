import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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

beforeEach(() => {
  window.history.replaceState({}, '', '/?screen=missions');
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('Missions API page', () => {
  it('maps and displays the mission of a powered drone', async () => {
    const fetchMock = vi.fn(async (input: string) => {
      if (input === '/api/missions?page=1&pageSize=100') {
        return reply({ data: [mission], total: 1 });
      }

      if (input === '/api/drones?page=1&pageSize=100') {
        return reply({
          data: [{ droneCode: 'DRONE-002', status: 'MAINTENANCE' }],
          total: 1,
        });
      }

      throw new Error(`Unexpected request: ${input}`);
    });
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

    render(<MissionListPage />);

    expect(await screen.findByText('Mission 002')).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'DRONE-002' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '8' })).toBeInTheDocument();
  });

  it('hides an offline drone mission until that drone is powered on', async () => {
    let status: 'OFFLINE' | 'MAINTENANCE' = 'OFFLINE';

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string) => {
        if (input === '/api/missions?page=1&pageSize=100') {
          return reply({ data: [mission], total: 1 });
        }

        if (input === '/api/drones?page=1&pageSize=100') {
          return reply({
            data: [{ droneCode: 'DRONE-002', status }],
            total: 1,
          });
        }

        throw new Error(`Unexpected request: ${input}`);
      }),
    );

    const firstView = render(<MissionListPage />);

    expect(await screen.findByText('No missions found')).toBeInTheDocument();
    expect(screen.queryByText('Mission 002')).not.toBeInTheDocument();

    firstView.unmount();
    status = 'MAINTENANCE';
    render(<MissionListPage />);

    expect(await screen.findByText('Mission 002')).toBeInTheDocument();
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
      vi.fn(async (input: string) => {
        if (input === '/api/missions?page=1&pageSize=100') {
          return reply({ data: [], total: 0 });
        }

        if (input === '/api/drones?page=1&pageSize=100') {
          return reply({ data: [], total: 0 });
        }

        throw new Error(`Unexpected request: ${input}`);
      }),
    );

    render(<MissionListPage />);

    expect(await screen.findByText('No missions found')).toBeInTheDocument();
  });
});