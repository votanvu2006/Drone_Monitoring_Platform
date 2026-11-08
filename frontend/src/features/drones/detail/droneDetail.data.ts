import { ApiRequestError, getApiData } from '../../../lib/api';
import type {
  DroneDetail,
  DroneDetailDataSource,
} from './droneDetail.types';

export const droneDetailDataSource: DroneDetailDataSource = {
  async loadByCode(droneCode: string): Promise<DroneDetail | null> {
    try {
      return await getApiData<DroneDetail>(
        `/drones/${encodeURIComponent(droneCode)}`,
      );
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 404) {
        return null;
      }

      throw error;
    }
  },
};