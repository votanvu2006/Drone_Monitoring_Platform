import { getAllApiPages } from '../../../lib/api';
import type {
  MissionListItem,
  MissionStatus,
} from './missionList.types';

type ApiMission = {
  missionCode: string;
  name: string;
  drone: {
    droneCode: string;
  };
  status: MissionStatus;
  waypointCount: number;
  createdAt: string;
};

type ApiDrone = {
  droneCode: string;
  status: 'OFFLINE' | 'AVAILABLE' | 'MAINTENANCE' | 'IN_FLIGHT';
};

function toUtcDateTime(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)) {
    throw new Error('Invalid mission creation date from API');
  }

  return `${value.replace(' ', 'T')}.000Z`;
}

export const missionListDataSource = {
  async loadMissions(): Promise<MissionListItem[]> {
    const [missions, drones] = await Promise.all([
      getAllApiPages<ApiMission>('/missions'),
      getAllApiPages<ApiDrone>('/drones'),
    ]);

    const poweredDroneCodes = new Set(
      drones
        .filter((drone) => drone.status !== 'OFFLINE')
        .map((drone) => drone.droneCode),
    );

    return missions
      .filter((mission) =>
        poweredDroneCodes.has(mission.drone.droneCode),
      )
      .map((mission) => ({
        id: mission.missionCode,
        name: mission.name,
        droneCode: mission.drone.droneCode,
        status: mission.status,
        waypointCount: mission.waypointCount,
        createdAt: toUtcDateTime(mission.createdAt),
      }));
  },
};