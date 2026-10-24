import { droneSeeds, missionSeeds } from '../../data/seeds';

const mission = missionSeeds.find(item => item.mission_code === 'MSN-002');
const drone = droneSeeds.find(item => item.id === mission?.drone_id);
export const preflightContext = {
  missionName: mission?.name ?? 'Mission not recorded',
  droneName: drone?.display_name ?? 'Aircraft not recorded',
  droneStatus: drone?.status ?? 'Not recorded',
};
