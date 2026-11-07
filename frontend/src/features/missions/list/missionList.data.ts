import { toUtcIso } from '../../../data/format';
import { getAllApiPages } from '../../../lib/api';
import type { MissionListItem } from './missionList.types';

type MissionResponse = {
  missionCode: string;
  name: string;
  drone: { droneCode: string };
  status: MissionListItem['status'];
  waypointCount: number;
  createdAt: string;
};

export const missionListDataSource = {
  async loadMissions(): Promise<MissionListItem[]> {
    const rows = await getAllApiPages<MissionResponse>('/missions?isCurrent=true');
    return rows.map(row => ({
      id: row.missionCode,
      name: row.name,
      droneCode: row.drone.droneCode,
      status: row.status,
      waypointCount: row.waypointCount,
      createdAt: toUtcIso(row.createdAt),
    }));
  },
};
