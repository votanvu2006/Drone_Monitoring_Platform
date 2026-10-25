import type { MissionListItem } from "./missionList.types";

function getDateDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);

  return date.toISOString();
}

const mockMissions: MissionListItem[] = [
  {
    id: "mission-001",
    name: "Mission 001",
    droneCode: "DRONE-001",
    status: "READY",
    waypointCount: 6,
    createdAt: getDateDaysAgo(0),
  },
  {
    id: "mission-002",
    name: "Mission 002",
    droneCode: "DRONE-002",
    status: "WARNING",
    waypointCount: 8,
    createdAt: getDateDaysAgo(2),
  },
  {
    id: "mission-003",
    name: "Mission 003",
    droneCode: "DRONE-003",
    status: "IN_PROGRESS",
    waypointCount: 8,
    createdAt: getDateDaysAgo(1),
  },
  {
    id: "mission-004",
    name: "Mission 004",
    droneCode: "DRONE-004",
    status: "COMPLETED",
    waypointCount: 5,
    createdAt: getDateDaysAgo(12),
  },
  {
    id: "mission-005",
    name: "Mission 005",
    droneCode: "DRONE-005",
    status: "FAILED",
    waypointCount: 10,
    createdAt: getDateDaysAgo(4),
  },
];

type MissionListDataSource = {
  loadMissions: () => Promise<MissionListItem[]>;
};

export const missionListDataSource: MissionListDataSource = {
  async loadMissions() {
    return mockMissions.map((mission) => ({ ...mission }));
  },
};