import snapshot from '../../../../../data/frontend.snapshot.json';
import type { DroneDetail, DroneDetailDataSource } from './droneDetail.types';

const droneDetails = snapshot.details as DroneDetail[];

export const droneDetailDataSource: DroneDetailDataSource = {
  async loadByCode(droneCode) {
    return droneDetails.find((drone) => drone.code === droneCode) ?? null;
  },
};