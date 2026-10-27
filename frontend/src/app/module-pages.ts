import type { ComponentType } from "react";
import { AlertsPage } from "../features/alerts/AlertsPage";
import DroneFleetView from "../features/drones/DroneFleetView";
import FlightHistoryListPage from "../features/flight-operations/history/list/FlightHistoryListPage";
import LiveFlightPage from "../features/flight-operations/live/LiveFlightPage";
import MissionListPage from "../features/missions/list/MissionListPage";
import type { NavigationItem } from "./navigation";

type ModulePageDefinition = {
  id: string;
  label: NavigationItem;
  component: ComponentType;
  contentHasMain: boolean;
};

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
] satisfies readonly ModulePageDefinition[];

export type ModulePageId = (typeof modulePages)[number]["id"];

export function getModulePage(moduleId: string | null) {
  return modulePages.find((page) => page.id === moduleId);
}   