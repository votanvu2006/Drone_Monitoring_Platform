import type { ReactNode } from 'react';
import { navigation } from '../app/examples';
import type { NavigationItem } from '../app/examples';
import { operatorProfile } from '../data/fixtures';
import { Icon } from './Icon';
import type { IconName } from './Icon';

const icons: Record<NavigationItem, IconName> = {
  Overview: 'overview', Drones: 'drone', Missions: 'mission',
  'Live Flight': 'flight', 'Flight History': 'history', Alerts: 'alert',
};

export function AppShell({ title, activeNav = 'Overview', children, contentHasMain = false }: {
  title: string; activeNav?: NavigationItem; children: ReactNode; contentHasMain?: boolean;
}) {
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-symbol"><Icon name="drone" size={23} /></span>
        <strong>Drone Monitoring<br />Platform</strong></div>
      <div className="workspace-label">Workspace</div>
      <nav aria-label="Primary navigation"><ul className="primary-nav">
        {navigation.map((item) => <li key={item}>
          <span className={'nav-item' + (item === activeNav ? ' is-selected' : '')}
            aria-current={item === activeNav ? 'page' : undefined}>
            <Icon name={icons[item]} /><span>{item}</span>
          </span>
        </li>)}
      </ul></nav>
      <div className="sidebar-bottom">
        <button type="button" className="logout-control" disabled>
          <Icon name="logout" size={18} /><span>Log out</span>
        </button>
      </div>
    </aside>
    <div className="main-column">
      <header className="topbar">
        <div className="breadcrumb"><span>Operations</span><span aria-hidden="true">/</span>
          <strong>{title}</strong></div>
        <div className="header-actions">
          <button type="button" className="theme-toggle" role="switch" aria-checked={false}
            aria-label="Dark theme" disabled>
            <span className="theme-switch-track" aria-hidden="true"><span /></span><span>Light</span>
          </button>
          <div className="operator"><span className="operator-avatar" aria-label="Signed-in user avatar">{operatorProfile.initials}</span>
            <strong>{operatorProfile.username}</strong></div>
        </div>
      </header>
      {contentHasMain ? <div className="page-content fleet-content">{children}</div>
        : <main className="page-content">{children}</main>}
    </div>
  </div>;
}
