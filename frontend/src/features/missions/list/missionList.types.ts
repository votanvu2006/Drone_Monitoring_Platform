export const MISSION_STATUSES = [
  "READY",
  "WARNING",
  "IN_PROGRESS",
  "COMPLETED",
  "FAILED",
] as const;

export type MissionStatus = (typeof MISSION_STATUSES)[number];

export type MissionStatusFilter = "ALL" | MissionStatus;

export type MissionDateFilter =
  | "ALL"
  | "LAST_7_DAYS"
  | "LAST_30_DAYS";

export type MissionListItem = {
  id: string;
  name: string;
  droneCode: string;
  status: MissionStatus;
  waypointCount: number;
  createdAt: string;
};

export type MissionListFilters = {
  searchText: string;
  status: MissionStatusFilter;
  droneCode: string;
  dateRange: MissionDateFilter;
};