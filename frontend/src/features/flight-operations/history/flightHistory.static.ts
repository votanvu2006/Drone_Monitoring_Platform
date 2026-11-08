import snapshot from '../../../../../data/frontend.snapshot.json';
import type { FlightHistoryDataSource, FlightHistoryDetail, FlightHistoryRecord } from './flightHistory.types';

export const DEFAULT_FLIGHT_CODE = 'FLIGHT-014';

export const staticFlightHistoryDataSource: FlightHistoryDataSource = {
  async loadRecords() {
    return structuredClone(snapshot.history) as FlightHistoryRecord[];
  },
  async loadDetail(flightCode) {
    const flight = snapshot.historyDetails.find(item => item.flightCode === flightCode);
    return flight ? structuredClone(flight) as FlightHistoryDetail : null;
  },
};
