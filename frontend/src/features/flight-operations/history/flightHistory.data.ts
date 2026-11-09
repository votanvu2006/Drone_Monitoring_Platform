import { ApiRequestError, getApiData } from '../../../lib/api';
import type { FlightHistoryDataSource, FlightHistoryDetail, FlightHistoryRecord } from './flightHistory.types';
export const DEFAULT_FLIGHT_CODE = 'FLIGHT-004';

export const flightHistoryDataSource: FlightHistoryDataSource = {
  loadRecords: () => getApiData<FlightHistoryRecord[]>('/flights/history'),
  async loadDetail(flightCode) {
    try { return await getApiData<FlightHistoryDetail>('/flights/' + encodeURIComponent(flightCode)); }
    catch (error) {
      if (error instanceof ApiRequestError && error.status === 404) return null;
      throw error;
    }
  },
};
