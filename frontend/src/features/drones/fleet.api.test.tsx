import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import DroneFleetView from './DroneFleetView';

function reply(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

const drone = {
  droneCode: 'DRONE-003',
  status: 'IN_FLIGHT',
  batteryPercent: 87,
  model: { modelName: 'AeroVision X1 Enterprise' },
  homeLocation: { label: 'Home base' },
  lastKnownLocation: { label: 'Current location' },
  activeMission: 'mission-003',
  findings: [],
};

const detail = {
  code: 'DRONE-003',
  status: 'IN_FLIGHT',
  isActivated: true,
  batteryPercent: 87,
  serialNumber: 'AVX1E-2026-0003',
  manufacturer: 'AeroVision',
  modelName: 'AeroVision X1 Enterprise',
  modelCode: 'AV-X1E',
  maxSpeedMps: 15,
  maxFlightTimeMinutes: 45,
  components: [],
  findings: [],
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Fleet API pages', () => {
  it('shows server values and reloads the selected drone after refresh', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(reply({ data: [drone], total: 1 }))
      .mockResolvedValueOnce(reply({ data: detail }))
      .mockResolvedValueOnce(reply({ data: detail }));
    vi.stubGlobal('fetch', fetchMock);

    const firstView = render(<DroneFleetView />);

    expect(await screen.findByText('DRONE-003')).toBeInTheDocument();
    expect(screen.getByText('87%')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'DRONE-003 power is on' }),
    ).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(
      screen.getByRole('button', { name: 'View details for DRONE-003' }),
    );

    expect(
      await screen.findByRole('heading', { name: 'DRONE-003' }),
    ).toBeInTheDocument();
    expect(new URLSearchParams(window.location.search).get('drone'))
      .toBe('DRONE-003');

    firstView.unmount();
    render(<DroneFleetView />);

    expect(
      await screen.findByText('AVX1E-2026-0003'),
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[2]?.[0]).toBe('/api/drones/DRONE-003');
  });

  it('shows an error without displaying snapshot data and retries', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new Error('Connection unavailable'))
      .mockResolvedValueOnce(reply({ data: [drone], total: 1 }));
    vi.stubGlobal('fetch', fetchMock);

    render(<DroneFleetView />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Unable to load drones',
    );
    expect(screen.queryByText('DRONE-003')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    expect(await screen.findByText('DRONE-003')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('shows an empty state for an empty API list', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(reply({ data: [], total: 0 })),
    );

    render(<DroneFleetView />);

    expect(await screen.findByText('No drones found.')).toBeInTheDocument();
  });

  it('distinguishes an unknown drone from a request failure', async () => {
    window.history.replaceState({}, '', '/?screen=drones&drone=DRONE-999');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reply({}, 404)));

    render(<DroneFleetView />);

    expect(await screen.findByText('Drone not found.')).toBeInTheDocument();
  });
});