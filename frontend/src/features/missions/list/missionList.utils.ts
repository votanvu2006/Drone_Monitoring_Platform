import type {
  MissionDateFilter,
  MissionListFilters,
  MissionListItem,
  MissionStatus,
  MissionStatusFilter,
} from "./missionList.types";

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

/* ---------- Status display ---------- */

export function formatMissionStatus(status: MissionStatus): string {
  return status
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/* ---------- Filter options and status counts ---------- */

export function getDroneCodes(
  missions: MissionListItem[],
): string[] {
  return Array.from(
    new Set(missions.map((mission) => mission.droneCode)),
  ).sort();
}

export function getStatusCounts(
  missions: MissionListItem[],
): Record<MissionStatusFilter, number> {
  const counts: Record<MissionStatusFilter, number> = {
    ALL: missions.length,
    READY: 0,
    WARNING: 0,
    IN_PROGRESS: 0,
    COMPLETED: 0,
    FAILED: 0,
  };

  for (const mission of missions) {
    counts[mission.status] += 1;
  }

  return counts;
}

/* ---------- Mission filtering ---------- */

function matchesDateRange(
  createdAt: string,
  dateRange: MissionDateFilter,
): boolean {
  if (dateRange === "ALL") {
    return true;
  }

  const createdTime = Date.parse(createdAt);

  if (Number.isNaN(createdTime)) {
    return false;
  }

  const days = dateRange === "LAST_7_DAYS" ? 7 : 30;
  const earliestTime =
    Date.now() - days * MILLISECONDS_PER_DAY;

  return createdTime >= earliestTime;
}

export function filterMissions(
  missions: MissionListItem[],
  filters: MissionListFilters,
): MissionListItem[] {
  const searchText = filters.searchText.trim().toLowerCase();

  return missions.filter((mission) => {
    const matchesSearch =
      searchText.length === 0 ||
      mission.name.toLowerCase().includes(searchText) ||
      mission.id.toLowerCase().includes(searchText) ||
      mission.droneCode.toLowerCase().includes(searchText);

    const matchesStatus =
      filters.status === "ALL" ||
      mission.status === filters.status;

    const matchesDrone =
      filters.droneCode === "ALL" ||
      mission.droneCode === filters.droneCode;

    const matchesDate = matchesDateRange(
      mission.createdAt,
      filters.dateRange,
    );

    return (
      matchesSearch &&
      matchesStatus &&
      matchesDrone &&
      matchesDate
    );
  });
}