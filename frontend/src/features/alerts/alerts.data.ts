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

// Frontend-only examples match the mission-002 / mission-005 Missions demo.
// These are not canonical ALT-* records. All timestamps below are fixed UTC.
export const alertSamples: readonly AlertRecord[] = [
  {
    alertCode: 'DEMO-ALT-001', title: 'Low battery',
    droneCode: 'DRONE-002', missionCode: 'mission-002',
    problemDescription: 'Battery level is below the recommended reserve.',
    severity: 'WARNING', sourceGroup: 'Components', detectedAt: '2026-10-21 06:05:00.000',
    resolutionNote: null,
  },
  {
    alertCode: 'DEMO-ALT-002', title: 'Motor temperature warning',
    droneCode: 'DRONE-002', missionCode: 'mission-002',
    problemDescription: 'Motor temperature is above the normal operating range.',
    severity: 'WARNING', sourceGroup: 'Components', detectedAt: '2026-10-21 06:08:00.000',
    resolutionNote: 'Inspect the motor and allow it to cool before the next flight.',
  },
  {
    alertCode: 'DEMO-ALT-003', title: 'Unsafe weather',
    droneCode: 'DRONE-005', missionCode: 'mission-005',
    problemDescription: 'Strong wind and poor visibility caused the mission to fail.',
    severity: 'CRITICAL', sourceGroup: 'Weather', detectedAt: '2026-10-19 06:10:00.000',
    resolutionNote: 'Mission stopped. Review weather conditions before scheduling a new attempt.',
  },
];

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
