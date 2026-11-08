import { getApiData } from '../../../lib/api';
import type { LiveFlightDataSource, LiveFlightSnapshot } from './liveFlight.types';

export const liveFlightDataSource: LiveFlightDataSource = {
  loadActiveFlights: () => getApiData<LiveFlightSnapshot[]>('/flights/active'),
};
