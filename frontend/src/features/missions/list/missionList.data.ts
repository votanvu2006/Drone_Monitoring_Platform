import snapshot from '../../../../../data/frontend.snapshot.json';
import type { MissionListItem } from './missionList.types';

const currentMissions = snapshot.missions as MissionListItem[];

export const missionListDataSource = {
  async loadMissions(): Promise<MissionListItem[]> {
    return currentMissions.map((mission) => ({ ...mission }));
  },
};