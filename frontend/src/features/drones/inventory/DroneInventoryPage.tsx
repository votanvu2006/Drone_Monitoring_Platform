import { useEffect, useMemo, useState } from "react";
import { DroneInventorySection } from "./components/DroneInventorySection";
import { FleetSummary } from "./components/FleetSummary";
import { fleetDataSource, mockSnapshot } from "./droneInventory.data";
import type {
  DroneInventoryFilters,
  DroneStatus,
  FleetSnapshot,
  SwitchableDroneStatus,
} from "./droneInventory.types";
import {
  DEFAULT_DRONE_INVENTORY_FILTERS,
  filterDrones,
  getDroneModelNames,
} from "./droneInventory.utils";
import "./styles/inventory.css";

type DroneInventoryPageProps = {
  onViewDetails: (droneCode: string) => void;
  droneStatusOverrides: Partial<Record<string, SwitchableDroneStatus>>;
  onTogglePower: (
    droneCode: string,
    nextStatus: SwitchableDroneStatus,
  ) => void;
};

function AddDronesControl() {
  return (
    <span className="add-drones-control">
      <button
        className="add-drones-button"
        type="button"
        disabled
        aria-describedby="add-drones-tooltip"
      >
        <svg
          viewBox="0 0 20 20"
          width="14"
          height="14"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M10 4v12M4 10h12"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>

        <span>Add drones</span>
      </button>

      <span
        className="add-drones-tooltip"
        id="add-drones-tooltip"
        role="tooltip"
      >
        Add drone
      </span>
    </span>
  );
}

function DroneInventoryPage({
  onViewDetails,
  droneStatusOverrides,
  onTogglePower,
}: DroneInventoryPageProps) {
  const [snapshot, setSnapshot] = useState<FleetSnapshot>(mockSnapshot);
  const [filters, setFilters] = useState<DroneInventoryFilters>(
    DEFAULT_DRONE_INVENTORY_FILTERS,
  );

  useEffect(() => {
    let isActive = true;

    fleetDataSource
      .loadSnapshot()
      .then((data) => {
        if (isActive) {
          setSnapshot(data);
        }
      })
      .catch((error: unknown) => {
        console.error("Failed to load fleet data:", error);
      });

    return () => {
      isActive = false;
    };
  }, []);

  const drones = useMemo(
    () =>
      snapshot.drones.map((drone) => ({
        ...drone,
        status: (droneStatusOverrides[drone.code] ??
          drone.status) as DroneStatus,
      })),
    [snapshot.drones, droneStatusOverrides],
  );

  const modelNames = useMemo(
    () => getDroneModelNames(drones),
    [drones],
  );

  const visibleDrones = useMemo(
    () => filterDrones(drones, filters),
    [drones, filters],
  );

  function updateFilters(changes: Partial<DroneInventoryFilters>) {
    setFilters((current) => ({ ...current, ...changes }));
  }

  return (
    <main className="fleet-page">
      <div className="page-container">
        <header className="page-heading">
          <div>
            <h1>Drones</h1>
            <p className="page-description">
              Manage and monitor your drone fleet
            </p>
          </div>

          <AddDronesControl />
        </header>

        <FleetSummary
          drones={drones}
          findings={snapshot.findings}
          modelNames={modelNames}
        />

        <DroneInventorySection
          drones={visibleDrones}
          modelNames={modelNames}
          filters={filters}
          onFiltersChange={updateFilters}
          onViewDetails={onViewDetails}
          onTogglePower={onTogglePower}
        />
      </div>
    </main>
  );
}

export default DroneInventoryPage;