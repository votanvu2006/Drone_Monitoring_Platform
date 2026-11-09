import { describe, expect, it } from 'vitest';
import snapshot from '../../../../data/frontend.snapshot.json';
import { staticLiveFlightDataSource } from './live/liveFlight.static';
import { staticFlightHistoryDataSource } from './history/flightHistory.static';
import { alertSamples } from '../alerts/alerts.data';

describe('v2.1.0 Flight Operations and Alerts static contract', () => {
  it('keeps the R6 offline baseline separate from powered-on API fixtures', () => {
    expect(snapshot.metadata.buildId).toBe('DRONE-DATA-2.1.0-R6-20261109');
    expect(snapshot.activeFlights).toEqual([]);
    expect(snapshot.fleet.drones.every((drone) => drone.status === 'OFFLINE')).toBe(true);
    expect(snapshot.history).toHaveLength(1);
    expect(snapshot.history[0]).toMatchObject({
      flightCode: 'FLIGHT-004',
      droneCode: 'DRONE-004',
      missionCode: 'mission-004',
      status: 'COMPLETED',
    });
  });

  it('shows the exact snapshot sections and completed flight detail', async () => {
    expect(await staticLiveFlightDataSource.loadActiveFlights()).toEqual(snapshot.activeFlights);
    expect(await staticFlightHistoryDataSource.loadRecords()).toEqual(snapshot.history);

    for (const detail of snapshot.historyDetails) {
      expect(await staticFlightHistoryDataSource.loadDetail(detail.flightCode)).toEqual(detail);
    }

    expect(alertSamples).toEqual(snapshot.alerts);
    expect(await staticFlightHistoryDataSource.loadDetail('missing')).toBeNull();

    const all = [...snapshot.activeFlights, ...snapshot.history];
    expect(all).toHaveLength(new Set(all.map((flight) => flight.flightCode)).size);
    expect(all.some((flight) => ['mission-002', 'mission-005'].includes(flight.missionCode))).toBe(false);
  });
});