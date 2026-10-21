import type { Drone, FleetDataSource, FleetSnapshot } from "./droneInventory.types";

const MODEL_NAME = "AeroVision X1 Enterprise";

const mockDrones: Drone[] = [
  "DRONE-001",
  "DRONE-002",
  "DRONE-003",
  "DRONE-004",
  "DRONE-005",
].map(
  (code): Drone => ({
    code,
    modelName: MODEL_NAME,
    status: "OFFLINE",
    homeBase: "District 1 Operations Home Base",
    lastKnownLocation: null,
    activeMission: null,
  }),
);

export const mockSnapshot: FleetSnapshot = {
  drones: mockDrones,

  // A configured faulty component becomes a finding only after
  // the monitoring system detects its issue during flight.
  findings: [],
};

export const fleetDataSource: FleetDataSource = {
  async loadSnapshot() {
    // Replace this return with an API request and response mapping
    // when the backend endpoint and response format are confirmed.
    return mockSnapshot;
  },
};