export type DroneStatus =
  | "OFFLINE"
  | "AVAILABLE"
  | "IN_FLIGHT"
  | "MAINTENANCE";

export type ComponentHealthStatus =
  | "HEALTHY"
  | "WARNING"
  | "FAULT"
  | "MAINTENANCE";