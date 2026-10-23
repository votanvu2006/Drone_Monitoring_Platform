import type { IconName } from '../components/Icon';

export const moduleNavigation = [
  { id: 'overview', label: 'Overview', path: '/overview', icon: 'overview' },
  { id: 'drones', label: 'Drones', path: '/drones', icon: 'drone' },
  { id: 'missions', label: 'Missions', path: '/missions', icon: 'mission' },
  { id: 'live-flight', label: 'Live Flight', path: '/live-flight', icon: 'flight' },
  { id: 'flight-history', label: 'Flight History', path: '/flight-history', icon: 'history' },
  { id: 'alerts', label: 'Alerts', path: '/alerts', icon: 'alert' },
] as const satisfies readonly { id: string; label: string; path: string; icon: IconName }[];

export type NavigationItem = typeof moduleNavigation[number]['label'];
export const navigation = moduleNavigation.map(item => item.label);

export type ModuleId = typeof moduleNavigation[number]['id'];
export type ModuleNavigationEntry = typeof moduleNavigation[number];
