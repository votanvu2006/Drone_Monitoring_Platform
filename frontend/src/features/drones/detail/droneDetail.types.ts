import type {
  ComponentHealthStatus,
  DroneStatus,
} from "../drone.types";

export type DroneComponentType =
  | "FRAME"
  | "PROPELLER"
  | "MOTOR"
  | "BATTERY"
  | "FLIGHT_CONTROLLER"
  | "GPS"
  | "SENSOR"
  | "CAMERA";

export type DroneComponentPosition =
  | "CENTER"
  | "FRONT"
  | "FRONT_LEFT"
  | "FRONT_RIGHT"
  | "REAR_LEFT"
  | "REAR_RIGHT"
  | "CENTER_REAR"
  | "TOP_CENTER"
  | "BOTTOM_FRONT";

export type ComponentFindingSeverity = Extract<
  ComponentHealthStatus,
  "WARNING" | "FAULT"
>;

export type DroneComponent = {
  code: string;
  type: DroneComponentType;
  name: string;
  position: DroneComponentPosition;
  model: string;
  primaryFunction: string;
  serialNumber: string;
  healthStatus: ComponentHealthStatus;
};

export type ComponentFinding = {
  id: string;
  droneCode: string;
  componentCode: string;
  missionCode: string;
  severity: ComponentFindingSeverity;
  detectedAt: string;
};

export type DroneDetail = {
  code: string;
  status: DroneStatus;
  isActivated: boolean;
  serialNumber: string;
  manufacturer: string;
  modelName: string;
  modelCode: string;
  maxSpeedMps: number;
  maxFlightTimeMinutes: number;
  components: DroneComponent[];
  findings: ComponentFinding[];
};

export type DroneDetailDataSource = {
  loadByCode: (droneCode: string) => Promise<DroneDetail | null>;
};