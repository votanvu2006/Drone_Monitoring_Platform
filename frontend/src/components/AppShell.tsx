import type { ReactNode } from 'react';
import { sidebarNavigation } from '../app/navigation';
import type { NavigationItem } from '../app/navigation';
import { operatorProfile } from '../data/fixtures';
import { Icon } from './Icon';

export function AppShell({ activeNav = 'Drones', children, contentHasMain = false }: {
  activeNav?: NavigationItem; children: ReactNode; contentHasMain?: boolean;
}) {
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-symbol"><Icon name="drone" size={23} /></span>
        <strong>Drone Monitoring<br />Platform</strong></div>
      <nav aria-label="Primary navigation"><ul className="primary-nav">
        {sidebarNavigation.map((item) => <li key={item.id}>
          <span className={'nav-item' + (item.label === activeNav ? ' is-selected' : '')}
            aria-current={item.label === activeNav ? 'page' : undefined}>
            <Icon name={item.icon} /><span>{item.label}</span>
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
        <div className="header-actions">
          <button type="button" className="theme-toggle" role="switch" aria-checked={false}
            aria-label="Dark theme" disabled>
            <span className="theme-switch-track" aria-hidden="true"><span /></span>
            <span>Light</span>
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
