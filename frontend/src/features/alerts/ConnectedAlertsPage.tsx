import { useEffect, useState } from 'react';
import { PageHeading } from '../../components/ui';
import { AlertsPage } from './AlertsPage';
import { loadAlerts } from './alerts.api';
import type { AlertViewModel } from './alerts.data';

type State = { kind: 'loading' } | { kind: 'error' } | { kind: 'ready'; records: AlertViewModel[] };
export function ConnectedAlertsPage({ droneCode, missionCode }: { droneCode?: string; missionCode?: string }) {
  const [state, setState] = useState<State>({ kind: 'loading' });
  useEffect(() => {
    let active = true;
    loadAlerts().then(records => { if (active) setState({ kind: 'ready', records }); })
      .catch(() => { if (active) setState({ kind: 'error' }); });
    return () => { active = false; };
  }, []);
  if (state.kind === 'ready') return <AlertsPage records={state.records} droneCode={droneCode} missionCode={missionCode} />;
  return <>
    <PageHeading title="Alerts" description="Operational alerts, ordered by severity and detection time." />
    {state.kind === 'loading' ? <p role="status">Loading alerts...</p> : <p role="alert">Unable to load alerts.</p>}
  </>;
}
