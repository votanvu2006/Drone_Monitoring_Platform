import { useEffect, useMemo, useRef, useState } from "react";
import { ApiRequestError } from "../../../lib/api";
import { fleetDataSource } from "./droneInventory.data";
import type { FleetSnapshot } from "./droneInventory.types";
import {
  DroneInventorySection,
  type FleetStatusFilter,
} from "./components/DroneInventorySection";
import { FleetSummary } from "./components/FleetSummary";
import "./styles/inventory.css";

type DroneInventoryPageProps = {
  onViewDetails: (droneCode: string) => void;
};

type LoadState = "loading" | "ready" | "error";

type FleetFilters = {
  searchText: string;
  status: FleetStatusFilter;
  modelName: string;
};

type PowerError = {
  droneCode: string;
  message: string;
};

function readFiltersFromUrl(): FleetFilters {
  const params = new URLSearchParams(window.location.search);
  const requestedStatus = params.get("fleetStatus");

  const validStatuses: FleetStatusFilter[] = [
    "ALL",
    "OFFLINE",
    "AVAILABLE",
    "IN_FLIGHT",
    "MAINTENANCE",
  ];

  return {
    searchText: params.get("fleetSearch") ?? "",
    status: validStatuses.includes(requestedStatus as FleetStatusFilter)
      ? (requestedStatus as FleetStatusFilter)
      : "ALL",
    modelName: params.get("fleetModel") || "ALL",
  };
}

function writeFiltersToUrl(filters: FleetFilters, replaceHistory: boolean) {
  const url = new URL(window.location.href);

  function setOrDelete(name: string, value: string, defaultValue: string) {
    if (value === defaultValue) {
      url.searchParams.delete(name);
    } else {
      url.searchParams.set(name, value);
    }
  }

  setOrDelete("fleetSearch", filters.searchText, "");
  setOrDelete("fleetStatus", filters.status, "ALL");
  setOrDelete("fleetModel", filters.modelName, "ALL");

  if (replaceHistory) {
    window.history.replaceState({}, "", url);
  } else {
    window.history.pushState({}, "", url);
  }
}

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

function DroneInventoryPage({ onViewDetails }: DroneInventoryPageProps) {
  const [snapshot, setSnapshot] = useState<FleetSnapshot | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [requestNumber, setRequestNumber] = useState(0);
  const [filters, setFilters] = useState<FleetFilters>(readFiltersFromUrl);
  const [updatingDroneCode, setUpdatingDroneCode] = useState<string | null>(
    null,
  );
  const [powerError, setPowerError] = useState<PowerError | null>(null);
  const powerRequestInFlight = useRef(false);

  useEffect(() => {
    let isActive = true;

    fleetDataSource
      .loadSnapshot()
      .then((data) => {
        if (isActive) {
          setSnapshot(data);
          setLoadState("ready");
        }
      })
      .catch((error: unknown) => {
        console.error("Failed to load fleet data:", error);

        if (isActive) {
          setSnapshot(null);
          setLoadState("error");
        }
      });

    return () => {
      isActive = false;
    };
  }, [requestNumber]);

  useEffect(() => {
    const syncFromUrl = () => setFilters(readFiltersFromUrl());

    window.addEventListener("popstate", syncFromUrl);
    return () => window.removeEventListener("popstate", syncFromUrl);
  }, []);

  const modelNames = useMemo(
    () =>
      snapshot
        ? Array.from(new Set(snapshot.drones.map((drone) => drone.modelName)))
        : [],
    [snapshot],
  );

  const visibleDrones = useMemo(() => {
    if (!snapshot) return [];

    const search = filters.searchText.trim().toLowerCase();

    return snapshot.drones.filter((drone) => {
      const matchesSearch =
        search === "" ||
        drone.code.toLowerCase().includes(search) ||
        drone.modelName.toLowerCase().includes(search);

      const matchesStatus =
        filters.status === "ALL" || drone.status === filters.status;

      const matchesModel =
        filters.modelName === "ALL" ||
        drone.modelName === filters.modelName;

      return matchesSearch && matchesStatus && matchesModel;
    });
  }, [snapshot, filters]);

  function updateFilters(
    nextFilters: Partial<FleetFilters>,
    replaceHistory = false,
  ) {
    const updated = { ...filters, ...nextFilters };
    setFilters(updated);
    writeFiltersToUrl(updated, replaceHistory);
  }

  async function togglePower(droneCode: string, isOn: boolean) {
    if (powerRequestInFlight.current) return;

    powerRequestInFlight.current = true;
    setUpdatingDroneCode(droneCode);
    setPowerError(null);

    try {
      const updated = await fleetDataSource.setPower(droneCode, isOn);

      // Show the saved status immediately.
      setSnapshot((current) =>
        current
          ? {
              ...current,
              drones: current.drones.map((drone) =>
                drone.code === updated.droneCode
                  ? { ...drone, status: updated.status }
                  : drone,
              ),
            }
          : current,
      );

      // Reload related values such as DRONE-003's active mission.
      const latestSnapshot = await fleetDataSource.loadSnapshot();
      setSnapshot(latestSnapshot);
    } catch (error) {
      console.error("Failed to update drone power:", error);

      const message =
        error instanceof ApiRequestError && error.status === 409
          ? "Drone status changed. Refresh the fleet and try again."
          : "Unable to update power. Try again.";

      setPowerError({ droneCode, message });
    } finally {
      powerRequestInFlight.current = false;
      setUpdatingDroneCode(null);
    }
  }

  function retry() {
    setSnapshot(null);
    setLoadState("loading");
    setRequestNumber((current) => current + 1);
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

        {loadState === "loading" && (
          <p className="fleet-page-message" role="status">
            Loading drones...
          </p>
        )}

        {loadState === "error" && (
          <div className="fleet-page-message" role="alert">
            <p>Unable to load drones. Check the connection and try again.</p>
            <button type="button" onClick={retry}>
              Retry
            </button>
          </div>
        )}

        {loadState === "ready" && snapshot?.drones.length === 0 && (
          <p className="fleet-page-message" role="status">
            No drones found.
          </p>
        )}

        {loadState === "ready" && snapshot && snapshot.drones.length > 0 && (
          <>
            <FleetSummary
              drones={snapshot.drones}
              findings={snapshot.findings}
              modelNames={modelNames}
            />

            <DroneInventorySection
              drones={visibleDrones}
              modelNames={modelNames}
              searchText={filters.searchText}
              status={filters.status}
              modelName={filters.modelName}
              onSearchTextChange={(searchText) =>
                updateFilters({ searchText }, true)
              }
              onStatusChange={(status) => updateFilters({ status })}
              onModelChange={(modelName) => updateFilters({ modelName })}
              onViewDetails={onViewDetails}
              onTogglePower={togglePower}
              updatingDroneCode={updatingDroneCode}
              powerError={powerError}
            />
          </>
        )}
      </div>
    </main>
  );
}

export default DroneInventoryPage;