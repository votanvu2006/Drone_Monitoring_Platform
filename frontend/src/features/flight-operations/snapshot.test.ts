import { describe, expect, it } from 'vitest';
import snapshot from '../../../../data/frontend.snapshot.json';
import { staticLiveFlightDataSource } from './live/liveFlight.data';
import { staticFlightHistoryDataSource } from './history/flightHistory.data';
import { alertSamples } from '../alerts/alerts.data';

describe('v2.1.0 Flight Operations and Alerts static contract', () => {
  it('keeps the R5 offline baseline separate from powered-on API fixtures', () => {
    expect(snapshot.metadata.buildId).toBe('DRONE-DATA-2.1.0-R5-20261106');
    expect(snapshot.activeFlights).toEqual([]);
    expect(snapshot.fleet.drones.every(drone => drone.status === 'OFFLINE')).toBe(true);
    expect(snapshot.history).toHaveLength(4);
  });

  it('shows the exact snapshot sections, with complete details for every historical flight', async () => {
    expect(await staticLiveFlightDataSource.loadActiveFlights()).toEqual(snapshot.activeFlights);
    expect(await staticFlightHistoryDataSource.loadRecords()).toEqual(snapshot.history);
    for (const detail of snapshot.historyDetails) {
      expect(await staticFlightHistoryDataSource.loadDetail(detail.flightCode)).toEqual(detail);
    }
    expect(alertSamples).toEqual(snapshot.alerts);
    expect(await staticFlightHistoryDataSource.loadDetail('missing')).toBeNull();
    const all = [...snapshot.activeFlights, ...snapshot.history];
    expect(all).toHaveLength(new Set(all.map(flight => flight.flightCode)).size);
    expect(all.some(flight => ['mission-002', 'mission-005'].includes(flight.missionCode))).toBe(false);
  });
});
