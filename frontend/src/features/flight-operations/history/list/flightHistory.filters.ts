import type {
  FlightHistoryRecord,
  FlightHistoryStatus,
} from "../flightHistory.types";

export type FlightStatusFilter = "ALL" | FlightHistoryStatus;
export type FlightDateFilter =
  | "ALL"
  | "LAST_7_DAYS"
  | "LAST_30_DAYS";

export type FlightHistoryFilterValues = {
  searchText: string;
  status: FlightStatusFilter;
  droneCode: string;
  dateRange: FlightDateFilter;
};

export const DEFAULT_FLIGHT_HISTORY_FILTERS: FlightHistoryFilterValues = {
  searchText: "",
  status: "ALL",
  droneCode: "ALL",
  dateRange: "ALL",
};

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

export function getFlightDroneCodes(
  records: FlightHistoryRecord[],
): string[] {
  return Array.from(
    new Set(records.map((record) => record.droneCode)),
  ).sort();
}

export function hasActiveFlightFilters(
  filters: FlightHistoryFilterValues,
): boolean {
  return (
    filters.searchText.trim() !== "" ||
    filters.status !== "ALL" ||
    filters.droneCode !== "ALL" ||
    filters.dateRange !== "ALL"
  );
}

function matchesSearch(
  record: FlightHistoryRecord,
  searchText: string,
): boolean {
  return (
    searchText === "" ||
    record.flightCode.toLowerCase().includes(searchText) ||
    record.droneCode.toLowerCase().includes(searchText) ||
    record.missionCode.toLowerCase().includes(searchText)
  );
}

function matchesDateRange(
  startedAt: string,
  dateRange: FlightDateFilter,
  now: Date,
): boolean {
  if (dateRange === "ALL") {
    return true;
  }

  const startedTime = Date.parse(startedAt);

  if (Number.isNaN(startedTime)) {
    return false;
  }

  const currentTime = now.getTime();
  const days = dateRange === "LAST_7_DAYS" ? 7 : 30;
  const earliestTime = currentTime - days * MILLISECONDS_PER_DAY;

  return startedTime >= earliestTime && startedTime <= currentTime;
}

export function filterFlightRecords(
  records: FlightHistoryRecord[],
  filters: FlightHistoryFilterValues,
  now: Date = new Date(),
): FlightHistoryRecord[] {
  const searchText = filters.searchText.trim().toLowerCase();

  return records.filter(
    (record) =>
      matchesSearch(record, searchText) &&
      (filters.status === "ALL" || record.status === filters.status) &&
      (filters.droneCode === "ALL" ||
        record.droneCode === filters.droneCode) &&
      matchesDateRange(record.startedAt, filters.dateRange, now),
  );
}