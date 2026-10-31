import { describe, expect, it } from 'vitest';
import snapshot from '../../../../data/frontend.snapshot.json';
import { staticLiveFlightDataSource } from './live/liveFlight.static';
import { staticFlightHistoryDataSource } from './history/flightHistory.static';
import { alertSamples } from '../alerts/alerts.data';

describe('v2.1.0 Flight Operations and Alerts static contract', () => {
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
