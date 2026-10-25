import type {
  Drone,
  DroneInventoryFilters,
  DroneStatus,
} from "./droneInventory.types";

export const DEFAULT_DRONE_INVENTORY_FILTERS: DroneInventoryFilters = {
  searchText: "",
  status: "ALL",
  modelName: "ALL",
};

export const DRONE_STATUS_FILTER_OPTIONS: {
  value: DroneStatus;
  label: string;
}[] = [
  { value: "OFFLINE", label: "Offline" },
  { value: "AVAILABLE", label: "Available" },
  { value: "IN_FLIGHT", label: "In flight" },
  { value: "MAINTENANCE", label: "Maintenance" },
];

export function getDroneModelNames(drones: Drone[]): string[] {
  return Array.from(new Set(drones.map((drone) => drone.modelName))).sort(
    (first, second) => first.localeCompare(second),
  );
}

export function filterDrones(
  drones: Drone[],
  filters: DroneInventoryFilters,
): Drone[] {
  const searchText = filters.searchText.trim().toLowerCase();

  return drones.filter((drone) => {
    const matchesSearch =
      searchText === "" ||
      drone.code.toLowerCase().includes(searchText) ||
      drone.modelName.toLowerCase().includes(searchText);

    const matchesStatus =
      filters.status === "ALL" || drone.status === filters.status;

    const matchesModel =
      filters.modelName === "ALL" ||
      drone.modelName === filters.modelName;

    return matchesSearch && matchesStatus && matchesModel;
  });
}