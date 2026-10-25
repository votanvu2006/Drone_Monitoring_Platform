// Flight records and outcomes
export const FLIGHT_HISTORY_STATUSES = [
  "COMPLETED",
  "FAILED",
] as const;

export type FlightHistoryStatus =
  (typeof FLIGHT_HISTORY_STATUSES)[number];

export type FlightHistoryRecord = {
  flightCode: string;
  startedAt: string;
  durationSeconds: number;
  droneCode: string;
  missionCode: string;
  status: FlightHistoryStatus;
};

// Route and telemetry
export type FlightHistoryWaypoint = {
  code: string;
  x: number;
  y: number;
};

export type FlightTelemetrySummary = {
  startBatteryPercent: number;
  endBatteryPercent: number;
  maxAltitudeMeters: number;
  averageSpeedMps: number;
  distanceMeters: number;
};

// Events may contain warnings even when the flight outcome is not WARNING.
export type FlightEventSeverity = "INFO" | "WARNING" | "ERROR";

export type FlightHistoryEvent = {
  id: string;
  occurredAt: string;
  title: string;
  description: string;
  severity: FlightEventSeverity;
};

// Detail view and data source
export type FlightHistoryDetail = FlightHistoryRecord & {
  routeName: string;
  waypoints: FlightHistoryWaypoint[];
  telemetry: FlightTelemetrySummary;
  events: FlightHistoryEvent[];
};

export type FlightHistoryDataSource = {
  loadRecords: () => Promise<FlightHistoryRecord[]>;
  loadDetail: (
    flightCode: string,
  ) => Promise<FlightHistoryDetail | null>;
};