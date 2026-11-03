import snapshot from '../../../../data/frontend.snapshot.json';
import { formatSeedTime, toUtcIso } from '../../data/format';

export type AlertSeverity = 'WARNING' | 'CRITICAL';
export type AlertSourceGroup = 'Components' | 'Weather';
export type AlertRecord = {
  alertCode: string;
  title: string;
  droneCode: string;
  missionCode: string;
  problemDescription: string;
  severity: AlertSeverity;
  sourceGroup: AlertSourceGroup;
  detectedAt: string;
  resolutionNote: string | null;
};

// Canonical bundled data for static previews and snapshot verification.
export const alertSamples = snapshot.alerts as AlertRecord[];

export function buildAlertView(record: AlertRecord) {
  return {
    ...record,
    detectedTime: { iso: toUtcIso(record.detectedAt), text: formatSeedTime(record.detectedAt) },
  };
}
export type AlertViewModel = ReturnType<typeof buildAlertView>;

type PriorityFields = Pick<AlertRecord, 'severity' | 'detectedAt' | 'alertCode'>;
export function compareAlertPriority(a: PriorityFields, b: PriorityFields): number {
  const priority: Record<AlertSeverity, number> = { CRITICAL: 0, WARNING: 1 };
  return priority[a.severity] - priority[b.severity]
    || (a.detectedAt === b.detectedAt ? 0 : a.detectedAt > b.detectedAt ? -1 : 1)
    || a.alertCode.localeCompare(b.alertCode, 'en');
}

export const defaultAlertCode = 'DEMO-ALT-001';
export const resolvedAlertCode = 'DEMO-ALT-003';
export const alerts = alertSamples.map(buildAlertView).sort(compareAlertPriority);
export const alertsByCode = new Map(alerts.map(alert => [alert.alertCode, alert]));
export const alertCounts = {
  total: alerts.length,
  critical: alerts.filter(alert => alert.severity === 'CRITICAL').length,
  warning: alerts.filter(alert => alert.severity === 'WARNING').length,
};
