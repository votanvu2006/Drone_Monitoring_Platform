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
// Overview keeps its route and preview metadata but is not a sidebar destination.
export const sidebarNavigation = moduleNavigation.filter(item => item.id !== 'overview');
export const navigation = sidebarNavigation.map(item => item.label);
