import snapshot from '../../../../../data/frontend.snapshot.json';
import type { FleetDataSource, FleetSnapshot } from './droneInventory.types';

export const mockSnapshot = snapshot.fleet as FleetSnapshot;

export const fleetDataSource: FleetDataSource = {
  async loadSnapshot() {
    return mockSnapshot;
  },
};