import type { DroneStatus } from "../drone.types";

export type { DroneStatus } from "../drone.types";

export type FindingSeverity = "WARNING" | "FAULT";

export type Drone = {
  code: string;
  modelName: string;
  status: DroneStatus;
  homeBase: string;
  lastKnownLocation: string | null;
  activeMission: string | null;
};

export type ComponentFinding = {
  id: string;
  droneCode: string;
  componentCode: string;
  severity: FindingSeverity;
  detectedAt: string;
};

export type FleetSnapshot = {
  drones: Drone[];
  findings: ComponentFinding[];
};

export type FleetDataSource = {
  loadSnapshot: () => Promise<FleetSnapshot>;
};