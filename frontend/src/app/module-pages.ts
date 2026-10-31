import type { ComponentType } from "react";
import { AlertsPage } from "../features/alerts/AlertsPage";
import DroneFleetView from "../features/drones/DroneFleetView";
import FlightHistoryListPage from "../features/flight-operations/history/list/FlightHistoryListPage";
import LiveFlightPage from "../features/flight-operations/live/LiveFlightPage";
import MissionListPage from "../features/missions/list/MissionListPage";
import {
  sidebarNavigation,
  type NavigationItem,
} from "./navigation";

type ModulePageDefinition = {
  id: string;
  label: NavigationItem;
  component: ComponentType;
  contentHasMain: boolean;
};

/* ---------- Available module pages ---------- */

export const modulePages = [
  {
    id: "drones",
    label: "Drones",
    component: DroneFleetView,
    contentHasMain: true,
  },
  {
    id: "missions",
    label: "Missions",
    component: MissionListPage,
    contentHasMain: true,
  },
  {
    id: "live-flight",
    label: "Live Flight",
    component: LiveFlightPage,
    contentHasMain: true,
  },
  {
    id: "flight-history",
    label: "Flight History",
    component: FlightHistoryListPage,
    contentHasMain: true,
  },
  {
    id: "alerts",
    label: "Alerts",
    component: AlertsPage,
    contentHasMain: false,
  },
] as const satisfies readonly ModulePageDefinition[];

export type ModulePage = (typeof modulePages)[number];
export type ModulePageId = ModulePage["id"];

/* ---------- Page lookup ---------- */

export function getModulePage(
  moduleId: string | null,
): ModulePage | undefined {
  return modulePages.find((page) => page.id === moduleId);
}

export function getModulePageByPath(
  path: string,
): ModulePage | undefined {
  const navigationItem = sidebarNavigation.find(
    (item) => item.path === path,
  );

  return navigationItem
    ? getModulePage(navigationItem.id)
    : undefined;
}