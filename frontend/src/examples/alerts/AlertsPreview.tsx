import type { ExampleProps } from '../../app/examples';
import { AlertsPage } from '../../features/alerts/AlertsPage';
import { defaultAlertCode, resolvedAlertCode } from '../../features/alerts/alerts.data';

export function AlertsPreview({ state }: ExampleProps) {
  const alertCode = new URLSearchParams(window.location.search).get('alert')
    ?? (state === 'detail-resolved' ? resolvedAlertCode : defaultAlertCode);
  return <main className="alerts-page"><div className="alerts-container">
    <AlertsPage view={state === 'list' ? 'list' : 'detail'} alertCode={alertCode} />
  </div></main>;
}
