import type { PropsWithChildren } from 'react';
import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mapMock = vi.hoisted(() => ({ fitBounds: vi.fn(), setView: vi.fn(), getZoom: vi.fn(() => 8) }));

vi.mock('react-leaflet', async () => {
  const React = await import('react');
  const Container = ({ children }: PropsWithChildren) => React.createElement('div', null, children);
  return {
    CircleMarker: Container,
    GeoJSON: () => null,
    MapContainer: Container,
    Polyline: () => null,
    TileLayer: () => null,
    Tooltip: Container,
    useMap: () => mapMock,
  };
});

import { MapView } from './MapView';

describe('MapView', () => {
  beforeEach(() => vi.clearAllMocks());

  it('does not recenter on every telemetry update but refits when the selected flight changes', () => {
    const view = render(<MapView current={{ latitude: 21, longitude: 105 }} fitKey={101} />);
    expect(mapMock.setView).toHaveBeenCalledTimes(1);

    view.rerender(<MapView current={{ latitude: 21.1, longitude: 105.1 }} fitKey={101} />);
    expect(mapMock.setView).toHaveBeenCalledTimes(1);

    view.rerender(<MapView current={{ latitude: 22, longitude: 106 }} fitKey={102} />);
    expect(mapMock.setView).toHaveBeenCalledTimes(2);
  });

  it('refits when the planned route changes', () => {
    const waypoint = (id: number, latitude: number) => ({ id, sequenceNumber: id, waypointType: 'INTERMEDIATE' as const, latitude, longitude: 105, altitudeM: 50, holdTimeSec: 0 });
    const view = render(<MapView waypoints={[waypoint(1, 21), waypoint(2, 22)]} />);
    expect(mapMock.fitBounds).toHaveBeenCalledTimes(1);

    view.rerender(<MapView waypoints={[waypoint(1, 31), waypoint(2, 32)]} />);
    expect(mapMock.fitBounds).toHaveBeenCalledTimes(2);
  });
});
