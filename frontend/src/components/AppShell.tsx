import type { ReactNode } from 'react';
import { moduleNavigation } from '../app/navigation';
import type { NavigationItem } from '../app/navigation';
import { operatorProfile } from '../data/fixtures';
import { Icon } from './Icon';

export function AppShell({ activeNav = 'Overview', children, contentClassName = '', navigationContent }: {
  activeNav?: NavigationItem; children: ReactNode; contentClassName?: string; navigationContent?: ReactNode;
}) {
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-symbol"><Icon name="drone" size={23} /></span>
        <strong>Drone Monitoring<br />Platform</strong></div>
      <nav aria-label="Primary navigation">{navigationContent ?? <ul className="primary-nav">
        {moduleNavigation.map((item) => <li key={item.id}>
          <span className={'nav-item' + (item.label === activeNav ? ' is-selected' : '')}
            aria-current={item.label === activeNav ? 'page' : undefined}>
            <Icon name={item.icon} /><span>{item.label}</span>
          </span>
        </li>)}
      </ul>}</nav>
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
      <main className={['page-content', contentClassName].filter(Boolean).join(' ')}>{children}</main>
    </div>
  </div>;
}
