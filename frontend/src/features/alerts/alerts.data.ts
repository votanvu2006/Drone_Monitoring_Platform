import { alertSeeds, missionSeeds, flightSeeds, droneSeeds, installedSeeds, componentSeeds } from '../../data/seeds';
import { formatSeedTime, toUtcIso } from '../../data/format';
export { toUtcIso };
export const formatAlertTime = formatSeedTime;

type SeedAlert = typeof alertSeeds[number];
// Normalize the heterogeneous JSON rows into one nullable record shape.
export type AlertRecord = { [Field in keyof SeedAlert]: SeedAlert[Field] };
export type AlertSourceGroup = 'Components' | 'Connectivity' | 'Airspace' | 'Weather' | 'System';

const rules: Record<string, { title: string; sourceGroup: AlertSourceGroup }> = {
  BATTERY_PERCENT_LOW: { title: 'Low battery', sourceGroup: 'Components' },
  BATTERY_VOLTAGE_LOW: { title: 'Battery voltage low', sourceGroup: 'Components' },
  BATTERY_OVERHEAT: { title: 'Battery overheating', sourceGroup: 'Components' },
  MOTOR_OVERHEAT: { title: 'Motor overheating', sourceGroup: 'Components' },
  MOTOR_RPM_ANOMALY: { title: 'Motor RPM anomaly', sourceGroup: 'Components' },
  EXCESSIVE_VIBRATION: { title: 'Excessive vibration', sourceGroup: 'Components' },
  PROPELLER_DAMAGE_SUSPECTED: { title: 'Suspected propeller damage', sourceGroup: 'Components' },
  GPS_LOST: { title: 'GPS signal lost', sourceGroup: 'Components' },
  COMMUNICATION_LOST: { title: 'Communication lost', sourceGroup: 'Connectivity' },
  HEARTBEAT_TIMEOUT: { title: 'Drone offline', sourceGroup: 'Connectivity' },
  RESTRICTED_FLIGHT_ZONE: { title: 'Restricted flight zone', sourceGroup: 'Airspace' },
  UNSAFE_WEATHER: { title: 'Unsafe weather', sourceGroup: 'Weather' },
  WEATHER_CAUTION: { title: 'Weather caution', sourceGroup: 'Weather' },
  MISSION_FAILED: { title: 'Mission failed', sourceGroup: 'System' },
};

function presentTime(value: string | null) {
  return value === null ? null : { iso: toUtcIso(value), text: formatSeedTime(value) };
}

export function buildAlertView(record: AlertRecord) {
  const rule = rules[record.rule_code];
  if (!rule) throw new Error('Missing alert presentation for ' + record.rule_code);
  const mission = missionSeeds.find(item => item.id === record.mission_id);
  const flight = flightSeeds.find(item => item.id === record.flight_id);
  const installed = installedSeeds.find(item => item.id === record.component_id);
  const component = componentSeeds.find(item => item.id === installed?.component_catalog_id);
  const droneId = flight?.drone_id ?? mission?.drone_id ?? installed?.drone_id;
  const drone = droneSeeds.find(item => item.id === droneId);
  return {
    ...record,
    ...rule,
    mission,
    flight,
    drone,
    contextLabel: [drone?.drone_code, mission?.mission_code].filter(Boolean).join(' · '),
    componentPositionLabel: component?.position.replaceAll('_', ' ') ?? 'Not recorded',
    observedText: formatMeasurement(record.observed_value, record.unit),
    thresholdText: formatMeasurement(record.threshold_value, record.unit),
    times: {
      detected: presentTime(record.detected_at), lastObserved: presentTime(record.last_observed_at),
      resolved: presentTime(record.resolved_at), created: presentTime(record.created_at), updated: presentTime(record.updated_at),
    },
    component: component && installed ? { ...component, installation: installed } : null,
  };
}
export type AlertViewModel = ReturnType<typeof buildAlertView>;

type PriorityFields = Pick<AlertRecord, 'severity' | 'status' | 'detected_at' | 'id'>;
export function compareAlertPriority(a: PriorityFields, b: PriorityFields): number {
  const severity: Record<string, number> = { CRITICAL: 0, WARNING: 1 };
  const status: Record<string, number> = { ACTIVE: 0, RESOLVED: 1 };
  return (severity[a.severity] ?? 2) - (severity[b.severity] ?? 2)
    || (status[a.status] ?? 2) - (status[b.status] ?? 2)
    || (a.detected_at === b.detected_at ? 0 : a.detected_at > b.detected_at ? -1 : 1)
    || b.id - a.id;
}

export const alerts = alertSeeds.map(buildAlertView).sort(compareAlertPriority);
export const alertsByCode = new Map(alerts.map(alert => [alert.alert_code, alert]));
export const alertCounts = {
  total: alerts.length,
  active: alerts.filter(alert => alert.status === 'ACTIVE').length,
  resolved: alerts.filter(alert => alert.status === 'RESOLVED').length,
};

export function formatMeasurement(value: number | null, unit: string | null): string {
  if (value === null) return 'Not recorded';
  return new Intl.NumberFormat('en-GB', { maximumFractionDigits: 3 }).format(value)
    + (unit ? ' ' + unit : '');
}
