import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { AlertsPage } from './pages/AlertsPage';
import { DronesPage } from './pages/DronesPage';
import { FlightHistoryPage } from './pages/FlightHistoryPage';
import { LiveFlightPage } from './pages/LiveFlightPage';
import { MissionDetailPage } from './pages/MissionDetailPage';
import { MissionsPage } from './pages/MissionsPage';
import { OverviewPage } from './pages/OverviewPage';

export default function App() {
  return <Routes><Route element={<AppShell />}>
    <Route index element={<OverviewPage />} />
    <Route path="drones" element={<DronesPage />} />
    <Route path="live-flight" element={<LiveFlightPage />} />
    <Route path="missions" element={<MissionsPage />} />
    <Route path="missions/:missionId" element={<MissionDetailPage />} />
    <Route path="alerts" element={<AlertsPage />} />
    <Route path="flight-history" element={<FlightHistoryPage />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Route></Routes>;
}
