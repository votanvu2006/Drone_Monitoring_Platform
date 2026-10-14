import type {
  ComponentHealthStatus,
  DroneStatus,
} from "../drone.types";
import type {
  ComponentFinding,
  DroneComponent,
  DroneDetail,
  DroneDetailDataSource,
} from "./droneDetail.types";

type ComponentDefinition = Omit<
  DroneComponent,
  "serialNumber" | "healthStatus"
>;

type DroneSeed = {
  code: string;
  serialNumber: string;
  status: DroneStatus;
  isActivated: boolean;
};

const MODEL = {
  manufacturer: "AeroVision (fictional)",
  modelName: "AeroVision X1 Enterprise",
  modelCode: "AV-X1E",
  maxSpeedMps: 15,
  maxFlightTimeMinutes: 45,
};

const componentCatalog: ComponentDefinition[] = [
  {
    code: "FRAME-CENTER",
    type: "FRAME",
    name: "Carbon Fiber Frame",
    position: "CENTER",
    model: "AV-X1E Carbon Monocoque",
    primaryFunction: "Supports and protects aircraft systems",
  },
  {
    code: "PROPELLER-FRONT_LEFT",
    type: "PROPELLER",
    name: "Front Left Propeller",
    position: "FRONT_LEFT",
    model: "9453F-class Low-Noise Propeller",
    primaryFunction: "Generates lift at the front-left arm",
  },
  {
    code: "PROPELLER-FRONT_RIGHT",
    type: "PROPELLER",
    name: "Front Right Propeller",
    position: "FRONT_RIGHT",
    model: "9453F-class Low-Noise Propeller",
    primaryFunction: "Generates lift at the front-right arm",
  },
  {
    code: "PROPELLER-REAR_LEFT",
    type: "PROPELLER",
    name: "Rear Left Propeller",
    position: "REAR_LEFT",
    model: "9453F-class Low-Noise Propeller",
    primaryFunction: "Generates lift at the rear-left arm",
  },
  {
    code: "PROPELLER-REAR_RIGHT",
    type: "PROPELLER",
    name: "Rear Right Propeller",
    position: "REAR_RIGHT",
    model: "9453F-class Low-Noise Propeller",
    primaryFunction: "Generates lift at the rear-right arm",
  },
  {
    code: "MOTOR-FRONT_LEFT",
    type: "MOTOR",
    name: "Front Left Motor",
    position: "FRONT_LEFT",
    model: "2008-class Brushless Motor",
    primaryFunction: "Drives the front-left propeller",
  },
  {
    code: "MOTOR-FRONT_RIGHT",
    type: "MOTOR",
    name: "Front Right Motor",
    position: "FRONT_RIGHT",
    model: "2008-class Brushless Motor",
    primaryFunction: "Drives the front-right propeller",
  },
  {
    code: "MOTOR-REAR_LEFT",
    type: "MOTOR",
    name: "Rear Left Motor",
    position: "REAR_LEFT",
    model: "2008-class Brushless Motor",
    primaryFunction: "Drives the rear-left propeller",
  },
  {
    code: "MOTOR-REAR_RIGHT",
    type: "MOTOR",
    name: "Rear Right Motor",
    position: "REAR_RIGHT",
    model: "2008-class Brushless Motor",
    primaryFunction: "Drives the rear-right propeller",
  },
  {
    code: "BATTERY-CENTER_REAR",
    type: "BATTERY",
    name: "Intelligent Flight Battery",
    position: "CENTER_REAR",
    model: "4S LiPo 5000 mAh 15.4 V",
    primaryFunction: "Supplies and monitors aircraft power",
  },
  {
    code: "FLIGHT_CONTROLLER-CENTER",
    type: "FLIGHT_CONTROLLER",
    name: "Flight Controller",
    position: "CENTER",
    model: "AV-FC2",
    primaryFunction: "Stabilizes aircraft and executes routes",
  },
  {
    code: "GPS-TOP_CENTER",
    type: "GPS",
    name: "GNSS Module",
    position: "TOP_CENTER",
    model: "Multi-constellation GNSS",
    primaryFunction: "Provides positioning and navigation data",
  },
  {
    code: "SENSOR-BOTTOM_FRONT",
    type: "SENSOR",
    name: "Vision and IMU Module",
    position: "BOTTOM_FRONT",
    model: "AV VisionSense",
    primaryFunction: "Supports obstacle awareness and stabilization",
  },
  {
    code: "CAMERA-FRONT",
    type: "CAMERA",
    name: "Monitoring Camera",
    position: "FRONT",
    model: "4K 3-Axis Gimbal Camera",
    primaryFunction: "Captures stabilized monitoring imagery",
  },
];

const drones: DroneSeed[] = [
  {
    code: "DRONE-001",
    serialNumber: "AVX1E-2026-0001",
    status: "OFFLINE",
    isActivated: false,
  },
  {
    code: "DRONE-002",
    serialNumber: "AVX1E-2026-0002",
    status: "OFFLINE",
    isActivated: false,
  },
  {
    code: "DRONE-003",
    serialNumber: "AVX1E-2026-0003",
    status: "OFFLINE",
    isActivated: false,
  },
  {
    code: "DRONE-004",
    serialNumber: "AVX1E-2026-0004",
    status: "OFFLINE",
    isActivated: false,
  },
  {
    code: "DRONE-005",
    serialNumber: "AVX1E-2026-0005",
    status: "OFFLINE",
    isActivated: false,
  },
];

/*
 * A finding is added here only when a mission reports a component issue.
 * The mission/API layer will provide the affected component and severity.
 */
const seedMissionFindings: ComponentFinding[] = [];

const seedDroneDetails: DroneDetail[] = drones.map((drone) => {
  const findings = seedMissionFindings.filter(
    (finding) => finding.droneCode === drone.code,
  );

  const healthByComponent = new Map<string, ComponentHealthStatus>();

  for (const finding of findings) {
    healthByComponent.set(finding.componentCode, finding.severity);
  }

  return {
    ...drone,
    ...MODEL,
    findings,
    components: componentCatalog.map((component) => ({
      ...component,
      serialNumber: `${drone.code}-AVX1-${component.type}-${component.position}`,
      healthStatus: healthByComponent.get(component.code) ?? "HEALTHY",
    })),
  };
});

export const droneDetailDataSource: DroneDetailDataSource = {
  async loadByCode(droneCode) {
    return seedDroneDetails.find((drone) => drone.code === droneCode) ?? null;
  },
};