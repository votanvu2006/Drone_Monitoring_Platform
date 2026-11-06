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

function toUtcDateTime(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)) {
    throw new Error('Invalid mission creation date from API');
  }

  return `${value.replace(' ', 'T')}.000Z`;
}

export const missionListDataSource = {
  async loadMissions(): Promise<MissionListItem[]> {
    const rows = await getAllApiPages<ApiMission>('/missions');

    return rows.map((row) => ({
      id: row.missionCode,
      name: row.name,
      droneCode: row.drone.droneCode,
      status: row.status,
      waypointCount: row.waypointCount,
      createdAt: toUtcDateTime(row.createdAt),
    }));
  },
};