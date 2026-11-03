import snapshot from '../../../../../data/frontend.snapshot.json';
import type { LiveFlightDataSource, LiveFlightSnapshot } from './liveFlight.types';

export const staticLiveFlightDataSource: LiveFlightDataSource = {
  async loadActiveFlights() {
    return structuredClone(snapshot.activeFlights) as LiveFlightSnapshot[];
  },
};
export const liveFlightDataSource = staticLiveFlightDataSource;
