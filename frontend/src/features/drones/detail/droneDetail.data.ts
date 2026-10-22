import { droneSeeds, modelSeeds, componentSeeds as catalogSeeds, installedSeeds } from '../../../data/seeds';
import type { ComponentHealthStatus, DroneStatus } from '../drone.types';
import type {
  DroneComponentPosition,
  DroneComponentType,
  DroneDetail,
  DroneDetailDataSource,
} from './droneDetail.types';

const seedDroneDetails: DroneDetail[] = droneSeeds.map((drone) => {
  const model = modelSeeds.find((item) => item.id === drone.drone_model_id);
  if (!model) throw new Error(`Missing seed model for ${drone.drone_code}`);

  const components = installedSeeds
    .filter((item) => item.drone_id === drone.id && item.installed)
    .map((installed) => {
      const component = catalogSeeds.find((item) => item.id === installed.component_catalog_id);
      if (!component) throw new Error(`Missing component catalog record ${installed.component_catalog_id}`);
      return {
        code: component.component_code,
        type: component.component_type as DroneComponentType,
        name: component.name,
        position: component.position as DroneComponentPosition,
        model: component.model,
        primaryFunction: component.primary_function,
        serialNumber: installed.component_serial_number,
        healthStatus: installed.health_status as ComponentHealthStatus,
      };
    });

  return {
    code: drone.drone_code,
    serialNumber: drone.serial_number,
    status: drone.status as DroneStatus,
    isActivated: drone.status !== 'OFFLINE',
    manufacturer: model.manufacturer,
    modelName: model.model_name,
    modelCode: model.model_code,
    maxSpeedMps: model.max_speed_mps,
    maxFlightTimeMinutes: model.max_flight_time_minutes,
    components,
    // Seed hardware health is independent of mission-generated findings.
    findings: [],
  };
});

export const droneDetailDataSource: DroneDetailDataSource = {
  async loadByCode(droneCode) {
    return seedDroneDetails.find((drone) => drone.code === droneCode) ?? null;
  },
};
