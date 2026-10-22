import { matchPath, Navigate, NavLink, Outlet, Route, Routes, useLocation } from 'react-router';
import { AppShell } from '../components/AppShell';
import { Icon } from '../components/Icon';
import { PageHeading, Panel } from '../components/ui';
import { DroneDetailRoute, DroneInventoryRoute } from './DroneRoutes';
import { ModuleContent, StandaloneLoginPage } from './ModuleContent';
import { moduleNavigation } from './navigation';

function ModuleLinks() {
  return <ul className="primary-nav">{moduleNavigation.map(module => <li key={module.id}>
    <NavLink to={module.path} end={module.id !== 'drones'} className={({isActive}) => 'nav-item' + (isActive ? ' is-selected' : '')}>
      <Icon name={module.icon} /><span>{module.label}</span>
    </NavLink>
  </li>)}</ul>;
}

function RoutedShell() {
  const { pathname } = useLocation();
  const module = moduleNavigation.find(item => matchPath(item.path, pathname)
    || (item.id === 'drones' && matchPath('/drones/:droneCode', pathname)));
  return <AppShell title={module?.label ?? 'Page not found'} navigationContent={<ModuleLinks />}
    contentClassName={module?.id === 'drones' ? 'fleet-content' : ''}><Outlet /></AppShell>;
}

function NotFoundPage() {
  return <><PageHeading eyebrow="WORKSPACE" title="Page not found" description="The page you requested could not be found." />
    <Panel title="Choose a page"><p>Use the sidebar to return to your workspace.</p></Panel></>;
}

export function AppRoutes() {
  return <Routes>
    <Route path="/login" element={<StandaloneLoginPage />} />
    <Route element={<RoutedShell />}>
      <Route index element={<Navigate to={moduleNavigation[0].path} replace />} />
      {moduleNavigation.filter(module => module.id !== 'drones').map(module =>
        <Route key={module.id} path={module.path} element={<ModuleContent module={module} />} />)}
      <Route path="/drones" element={<DroneInventoryRoute />} />
      <Route path="/drones/:droneCode" element={<DroneDetailRoute />} />
      <Route path="*" element={<NotFoundPage />} />
    </Route>
  </Routes>;
}
