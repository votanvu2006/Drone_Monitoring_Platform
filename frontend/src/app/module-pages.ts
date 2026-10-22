import type { ComponentType } from 'react';
import DroneFleetView from '../features/drones/DroneFleetView';
import type { ModuleId } from './navigation';

// Only files present in this checkout can be composed. Optional modules become
// available when their feature PRs are merged; their unmerged branches are never imported.
const overviewModules = import.meta.glob<{ OverviewPage: ComponentType }>('../features/overview/OverviewPage.tsx', { eager: true });
const alertModules = import.meta.glob<{ AlertsPage: ComponentType }>('../features/alerts/AlertsPage.tsx', { eager: true });
const loginModules = import.meta.glob<{ LoginPage: ComponentType }>('../features/authentication/LoginPage.tsx', { eager: true });

export const availableModulePages: Partial<Record<ModuleId, ComponentType>> = {
  drones: DroneFleetView,
  overview: Object.values(overviewModules)[0]?.OverviewPage,
  alerts: Object.values(alertModules)[0]?.AlertsPage,
};
export const availableLoginPage = Object.values(loginModules)[0]?.LoginPage;
