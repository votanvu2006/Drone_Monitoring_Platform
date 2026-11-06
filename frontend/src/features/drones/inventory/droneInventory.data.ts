import { getAllApiPages } from '../../../lib/api';
import type {
  FleetDataSource,
  FleetSnapshot,
} from './droneInventory.types';
import type { DroneStatus } from '../drone.types';

type ApiFinding = {
  id: string;
  droneCode: string;
  missionCode: string;
  componentCode: string;
  severity: 'WARNING' | 'FAULT';
  detectedAt: string;
};

type ApiDrone = {
  droneCode: string;
  status: DroneStatus;
  batteryPercent: number;
  model: {
    modelName: string;
  };
  homeLocation: {
    label: string;
  };
  lastKnownLocation: {
    label: string | null;
  } | null;
  activeMission: string | null;
  findings: ApiFinding[];
};

export const fleetDataSource: FleetDataSource = {
  async loadSnapshot(): Promise<FleetSnapshot> {
    const rows = await getAllApiPages<ApiDrone>('/drones');

    return {
      drones: rows.map((row) => ({
        code: row.droneCode,
        modelName: row.model.modelName,
        status: row.status,
        batteryPercent: row.batteryPercent,
        homeBase: row.homeLocation.label,
        lastKnownLocation: row.lastKnownLocation?.label ?? null,
        activeMission: row.activeMission,
      })),
      findings: rows.flatMap((row) =>
        row.findings.map((finding) => ({
          id: finding.id,
          droneCode: finding.droneCode,
          componentCode: finding.componentCode,
          severity: finding.severity,
          detectedAt: finding.detectedAt,
        })),
      ),
    };
  },
};