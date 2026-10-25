import { useCallback, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Activity, Bell, ChevronDown, Command, Compass, LayoutDashboard, MapPinned, Menu, Plane, Radio, ShieldCheck, X } from 'lucide-react';
import { usePolling } from '../hooks/usePolling';
import { api } from '../lib/api';

const navigation = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/drones', label: 'Drones', icon: Plane },
  { to: '/live-flight', label: 'Live flight', icon: Radio },
  { to: '/missions', label: 'Missions', icon: MapPinned },
  { to: '/alerts', label: 'Alerts', icon: Bell },
  { to: '/flight-history', label: 'Flight history', icon: Activity },
];

export function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const currentPage = location.pathname.startsWith('/missions/')
    ? 'Mission detail'
    : navigation.find((item) => item.to === location.pathname)?.label || 'Flight desk';
  const healthLoader = useCallback(() => api.health(), []);
  const alertsLoader = useCallback(() => api.alerts({ status: 'ACTIVE', page: 1, pageSize: 1 }), []);
  const health = usePolling(healthLoader, 30_000);
  const alertCount = usePolling(alertsLoader, 30_000);

  return <div className="app-shell">
    <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
      <div className="brand"><span className="brand-mark"><Command size={18} /></span><span>NORTHSTAR<small>FLIGHT OPERATIONS</small></span><button className="mobile-close" aria-label="Close navigation" onClick={() => setMenuOpen(false)}><X size={18} /></button></div>
      <div className="workspace-label">WORKSPACE</div>
      <nav className="primary-nav" aria-label="Primary navigation">
        {navigation.map(({ to, label, icon: Icon, end }) => <NavLink key={to} to={to} end={end} onClick={() => setMenuOpen(false)} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}><Icon size={17} strokeWidth={1.8} /><span>{label}</span>{label === 'Alerts' && Boolean(alertCount.data?.total) && <span className="nav-count">{alertCount.data!.total > 99 ? '99+' : alertCount.data!.total}</span>}</NavLink>)}
      </nav>
      <div className="sidebar-bottom"><div className="system-status"><span className={`pulse ${health.error ? 'offline' : ''}`} /><div><b>API status</b><small>{health.error ? 'Disconnected' : health.loading ? 'Connecting…' : 'Connected'}</small></div><ChevronDown size={14} /></div><div className="sidebar-footer"><ShieldCheck size={14} /> DEMO ENVIRONMENT</div></div>
    </aside>
    {menuOpen && <button className="mobile-scrim" aria-label="Close navigation overlay" onClick={() => setMenuOpen(false)} />}
    <main className="main-column">
      <header className="topbar"><button className="mobile-menu icon-button" aria-label="Open navigation" onClick={() => setMenuOpen(true)}><Menu size={19} /></button><div className="breadcrumb"><Compass size={15} /><span>Operations</span><span className="crumb-divider">/</span><span className="crumb-current">{currentPage}</span></div><div className="topbar-right"><div className={`live-indicator ${health.error ? 'offline' : ''}`}><span className={`pulse ${health.error ? 'offline' : ''}`} />{health.error ? 'API OFFLINE' : health.loading ? 'CONNECTING' : 'API CONNECTED'}</div><div className="topbar-divider" /><div className="user-chip"><span className="avatar">PL</span><span>Project lead</span></div></div></header>
      <div className="page-content"><Outlet /></div>
    </main>
  </div>;
}
