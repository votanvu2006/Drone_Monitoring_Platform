import { useEffect, useMemo, useState } from "react";
import { MissionListSection } from "./components/MissionListSection";
import { missionListDataSource } from "./missionList.data";
import type {
  MissionListFilters,
  MissionListItem,
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

const initialFilters: MissionListFilters = {
  searchText: "",
  status: "ALL",
  droneCode: "ALL",
  dateRange: "ALL",
};

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
  // Load mission data.
  const [missions, setMissions] = useState<MissionListItem[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");

  // Keep the selected filters on this page.
  const [filters, setFilters] =
    useState<MissionListFilters>(initialFilters);

  useEffect(() => {
    let isActive = true;

    missionListDataSource
      .loadMissions()
      .then((data) => {
        if (!isActive) {
          return;
        }

        setMissions(data);
        setLoadState("ready");
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

  // Derive the values shown in the filters and table.
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

  function updateFilters(nextFilters: Partial<MissionListFilters>) {
    setFilters((currentFilters) => ({
      ...currentFilters,
      ...nextFilters,
    }));
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
              updateFilters({ searchText })
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