import { droneSeeds, missionSeeds, modelSeeds } from '../../../data/seeds';
import type { Drone, DroneStatus, FleetDataSource, FleetSnapshot } from './droneInventory.types';

const statuses: Record<string, DroneStatus | undefined> = {
  OFFLINE: 'OFFLINE', AVAILABLE: 'AVAILABLE', IN_FLIGHT: 'IN_FLIGHT', MAINTENANCE: 'MAINTENANCE',
};

const seedDrones: Drone[] = droneSeeds.map(drone => {
  const model = modelSeeds.find(item => item.id === drone.drone_model_id);
  const status = statuses[drone.status];
  if (!model || !status) throw new Error('Invalid fleet seed for ' + drone.drone_code);
  return {
    code: drone.drone_code, modelName: model.model_name, status,
    homeBase: drone.home_location_label,
    lastKnownLocation: drone.last_known_location_label,
    activeMission: missionSeeds.find(mission => mission.drone_id === drone.id && mission.status === 'RUNNING')?.mission_code ?? null,
  };
});

export const mockSnapshot: FleetSnapshot = {
  drones: seedDrones,
  // Seed hardware health is separate from findings detected during a flight.
  findings: [],
};

export const fleetDataSource: FleetDataSource = {
  async loadSnapshot() { return mockSnapshot; },
};
