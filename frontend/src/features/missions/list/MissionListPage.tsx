import { useEffect, useMemo, useState } from "react";
import { MissionListSection } from "./components/MissionListSection";
import { missionListDataSource } from "./missionList.data";
import {
  MISSION_STATUSES,
  type MissionDateFilter,
  type MissionListFilters,
  type MissionListItem,
  type MissionStatusFilter,
} from "./missionList.types";
import {
  filterMissions,
  getDroneCodes,
  getStatusCounts,
} from "./missionList.utils";
import "./styles/mission-list.css";

type LoadState = "loading" | "ready" | "error";

type MissionListPageProps = {
  onViewAlert?: (mission: MissionListItem) => void;
};

function readFiltersFromUrl(): MissionListFilters {
  const params = new URLSearchParams(window.location.search);
  const requestedStatus = params.get("missionStatus");
  const requestedDate = params.get("missionDate");

  const status: MissionStatusFilter =
    requestedStatus &&
    MISSION_STATUSES.some((item) => item === requestedStatus)
      ? (requestedStatus as MissionStatusFilter)
      : "ALL";

  const dateRange: MissionDateFilter =
    requestedDate === "LAST_7_DAYS" ||
    requestedDate === "LAST_30_DAYS"
      ? requestedDate
      : "ALL";

  return {
    searchText: params.get("missionSearch") ?? "",
    status,
    droneCode: params.get("missionDrone") || "ALL",
    dateRange,
  };
}

function writeFiltersToUrl(
  filters: MissionListFilters,
  replaceHistory: boolean,
) {
  const url = new URL(window.location.href);

  function setOrDelete(name: string, value: string, defaultValue: string) {
    if (value === defaultValue) {
      url.searchParams.delete(name);
    } else {
      url.searchParams.set(name, value);
    }
  }

  setOrDelete("missionSearch", filters.searchText, "");
  setOrDelete("missionStatus", filters.status, "ALL");
  setOrDelete("missionDrone", filters.droneCode, "ALL");
  setOrDelete("missionDate", filters.dateRange, "ALL");

  if (replaceHistory) {
    window.history.replaceState({}, "", url);
  } else {
    window.history.pushState({}, "", url);
  }
}

function CreateMissionControl() {
  return (
    <span className="mission-create-control" title="Coming soon">
      <button
        className="mission-create-button"
        type="button"
        disabled
        aria-label="Create mission — coming soon"
      >
        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M10 4v12M4 10h12" />
        </svg>
        <span>Create Mission</span>
      </button>
    </span>
  );
}

function MissionListPage({ onViewAlert }: MissionListPageProps) {
  const [missions, setMissions] = useState<MissionListItem[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [filters, setFilters] = useState<MissionListFilters>(
    readFiltersFromUrl,
  );

  useEffect(() => {
    let isActive = true;

    missionListDataSource
      .loadMissions()
      .then((data) => {
        if (isActive) {
          setMissions(data);
          setLoadState("ready");
        }
      })
      .catch((error: unknown) => {
        console.error("Failed to load missions:", error);

        if (isActive) {
          setLoadState("error");
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    const syncFromUrl = () => setFilters(readFiltersFromUrl());

    window.addEventListener("popstate", syncFromUrl);
    return () => window.removeEventListener("popstate", syncFromUrl);
  }, []);

  const droneCodes = useMemo(
    () => getDroneCodes(missions),
    [missions],
  );

  const statusCounts = useMemo(
    () => getStatusCounts(missions),
    [missions],
  );

  const visibleMissions = useMemo(
    () => filterMissions(missions, filters),
    [missions, filters],
  );

  function updateFilters(
    nextFilters: Partial<MissionListFilters>,
    replaceHistory = false,
  ) {
    const updated = { ...filters, ...nextFilters };
    setFilters(updated);
    writeFiltersToUrl(updated, replaceHistory);
  }

  return (
    <main className="mission-page">
      <div className="mission-page-container">
        <header className="mission-page-heading">
          <div>
            <h1>Missions</h1>
            <p>Plan and manage drone missions</p>
          </div>

          <CreateMissionControl />
        </header>

        {loadState === "loading" && (
          <div className="mission-page-message" role="status">
            Loading missions...
          </div>
        )}

        {loadState === "error" && (
          <div className="mission-page-message" role="alert">
            Unable to load missions. Please try again later.
          </div>
        )}

        {loadState === "ready" && (
          <MissionListSection
            missions={visibleMissions}
            statusCounts={statusCounts}
            droneCodes={droneCodes}
            filters={filters}
            onSearchTextChange={(searchText) =>
              updateFilters({ searchText }, true)
            }
            onStatusChange={(status) =>
              updateFilters({ status })
            }
            onDroneChange={(droneCode) =>
              updateFilters({ droneCode })
            }
            onDateRangeChange={(dateRange) =>
              updateFilters({ dateRange })
            }
            onViewAlert={onViewAlert}
          />
        )}
      </div>
    </main>
  );
}

export default MissionListPage;