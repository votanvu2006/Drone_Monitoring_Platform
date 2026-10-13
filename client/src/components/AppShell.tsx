import type { ReactNode } from 'react';
import { navigation } from '../app/examples';
import type { NavigationItem } from '../app/examples';
import { Icon } from './Icon';
import type { IconName } from './Icon';

const icons: Record<NavigationItem, IconName> = {
  Overview: 'overview', Drones: 'drone', Missions: 'mission',
  'Live Flight': 'flight', 'Flight History': 'history', Alerts: 'alert',
};

export function AppShell({ title, activeNav = 'Overview', children }: {
  title: string; activeNav?: NavigationItem; children: ReactNode;
}) {
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-symbol"><Icon name="drone" size={25} /></span>
        <div>DRONE<span>MONITORING PLATFORM</span></div></div>
      <div className="workspace-label">OPERATIONS WORKSPACE</div>
      <nav aria-label="Primary navigation"><ul className="primary-nav">
        {navigation.map((item) => <li key={item}>
          <span className={'nav-item' + (item === activeNav ? ' is-selected' : '')}
            aria-current={item === activeNav ? 'page' : undefined}>
            <Icon name={icons[item]} /><span>{item}</span>
          </span>
        </li>)}
      </ul></nav>
      <div className="sidebar-bottom">
        <div className="workspace-card"><span className="status-dot" /><div>
          <strong>Training workspace</strong><span>Ho Chi Minh City</span>
        </div></div>
        <p className="sidebar-caption">PRECISION IN EVERY FLIGHT</p>
      </div>
    </aside>
    <div className="main-column">
      <header className="topbar">
        <div className="breadcrumb"><span>Operations</span><span aria-hidden="true">/</span>
          <strong>{title}</strong></div>
        <div className="operator"><span className="operator-avatar">PQ</span><div>
          <strong>Flight operator</strong><span>Operations team</span>
        </div></div>
      </header>
      <main className="page-content">{children}</main>
      <footer className="app-footer">DRONE MONITORING PLATFORM <span>Plan. Monitor. Review.</span></footer>
    </div>
  </div>;
}
