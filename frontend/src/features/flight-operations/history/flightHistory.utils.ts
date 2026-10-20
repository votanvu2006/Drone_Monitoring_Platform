import type { FlightHistoryStatus } from "./flightHistory.types";

// Date and time display
const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

const eventTimeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
});

export function formatFlightDateTime(value: string): string {
  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : dateTimeFormatter.format(date);
}

export function formatFlightEventTime(value: string): string {
  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "Time unavailable"
    : eventTimeFormatter.format(date);
}

// Duration display
export function formatFlightDuration(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainingSeconds = safeSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m ${String(remainingSeconds).padStart(2, "0")}s`;
}

// Flight outcome display
const statusLabels: Record<FlightHistoryStatus, string> = {
  COMPLETED: "Completed",
  FAILED: "Failed",
};

export function formatFlightStatus(
  status: FlightHistoryStatus,
): string {
  return statusLabels[status];
}

export function getFlightStatusClass(
  status: FlightHistoryStatus,
): string {
  return status.toLowerCase();
}