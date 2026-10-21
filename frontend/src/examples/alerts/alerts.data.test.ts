import { describe, expect, it } from 'vitest';
import seedAlerts from '../../../../data/08-alerts/alerts.json';
import {
  alertCounts, alerts, alertsByCode, compareAlertPriority, formatAlertTime, formatMeasurement, toUtcIso,
} from './alerts.data';

describe('canonical alert read model', () => {
  it('contains all 24 unique records and preserves every original field', () => {
    expect(alertCounts).toEqual({ total: 24, active: 6, resolved: 18 });
    expect(alertsByCode.size).toBe(24);
    for (const record of seedAlerts) {
      expect(alertsByCode.get(record.alert_code)).toMatchObject(record);
    }
    expect(seedAlerts[0].alert_code).toBe('ALT-001');
  });

  it('orders severity, active status, newest detection and ID deterministically', () => {
    expect(alerts.slice(0, 5).map(alert => alert.alert_code)).toEqual([
      'ALT-022', 'ALT-021', 'ALT-015', 'ALT-014', 'ALT-013',
    ]);
    expect(alerts.slice(-3).map(alert => alert.alert_code)).toEqual(['ALT-012', 'ALT-024', 'ALT-007']);
    const sample = { severity: 'CRITICAL', status: 'ACTIVE', detected_at: '2026-08-01 00:00:00.000', id: 1 };
    expect(compareAlertPriority(sample, { ...sample, severity: 'WARNING' })).toBeLessThan(0);
    expect(compareAlertPriority(sample, { ...sample, status: 'RESOLVED' })).toBeLessThan(0);
    expect(compareAlertPriority({ ...sample, detected_at: '2026-09-01 00:00:00.000' }, sample)).toBeLessThan(0);
    expect(compareAlertPriority({ ...sample, id: 2 }, sample)).toBeLessThan(0);
    expect(compareAlertPriority(sample, sample)).toBe(0);
  });

  it('classifies GPS and hardware as Components while retaining the detection source', () => {
    for (const alert of alerts.filter(item => item.rule_code === 'GPS_LOST')) {
      expect(alert.sourceGroup).toBe('Components');
      expect(alert.source).toBe('TELEMETRY');
    }
    expect(alertsByCode.get('ALT-017')?.sourceGroup).toBe('Connectivity');
    expect(alertsByCode.get('ALT-018')?.sourceGroup).toBe('Connectivity');
    expect(alertsByCode.get('ALT-021')?.sourceGroup).toBe('Airspace');
    expect(alertsByCode.get('ALT-023')?.sourceGroup).toBe('Weather');
    expect(alertsByCode.get('ALT-015')?.sourceGroup).toBe('System');
    expect(alerts.every(alert => alert.title && alert.sourceGroup)).toBe(true);
  });

  it('joins the matching mission, flight, drone and installed part for every record', () => {
    for (const alert of alerts) {
      if (alert.mission_id !== null) expect(alert.mission?.id).toBe(alert.mission_id);
      if (alert.flight_id !== null) expect(alert.flight?.id).toBe(alert.flight_id);
      else expect(alert.flight).toBeUndefined();
      expect(alert.drone?.id).toBe(alert.flight?.drone_id ?? alert.mission?.drone_id);
      if (alert.component_id !== null) {
        expect(alert.component?.installation.id).toBe(alert.component_id);
        expect(alert.component?.installation.drone_id).toBe(alert.drone?.id);
        expect(alert.component?.id).toBe(alert.component?.installation.component_catalog_id);
      } else expect(alert.component).toBeNull();
    }
    expect(alertsByCode.get('ALT-014')?.component?.position).toBe('REAR_RIGHT');
  });

  it('interprets seed times as UTC and always displays ICT', () => {
    expect(toUtcIso('2026-08-14 06:08:22.000')).toBe('2026-08-14T06:08:22.000Z');
    expect(formatAlertTime('2026-08-14 06:08:22.000')).toBe('14 Aug 2026, 13:08:22 ICT');
    expect(formatAlertTime('2026-08-14 23:30:00')).toBe('15 Aug 2026, 06:30:00 ICT');
    expect(formatAlertTime(null)).toBe('Not recorded');
  });

  it('keeps zero measurements and missing values distinct', () => {
    expect(formatMeasurement(0, '%')).toBe('0 %');
    expect(formatMeasurement(0, null)).toBe('0');
    expect(formatMeasurement(null, '%')).toBe('Not recorded');
    expect(formatMeasurement(12.345, 'V')).toBe('12.345 V');
  });
});
