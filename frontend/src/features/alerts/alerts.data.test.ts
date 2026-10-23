import { describe, expect, it } from 'vitest';
import { alertSamples, alerts, alertsByCode, alertCounts, compareAlertPriority } from './alerts.data';

describe('fixed mission alert examples', () => {
  it('contains the three distinct examples required by the Missions demo', () => {
    expect(alertCounts).toEqual({ total: 3, critical: 1, warning: 2 });
    expect(alertsByCode.size).toBe(3);
    expect(alertSamples.map(({ alertCode, droneCode, missionCode, severity, sourceGroup }) =>
      ({ alertCode, droneCode, missionCode, severity, sourceGroup }))).toEqual([
      { alertCode: 'DEMO-ALT-001', droneCode: 'DRONE-002', missionCode: 'mission-002', severity: 'WARNING', sourceGroup: 'Components' },
      { alertCode: 'DEMO-ALT-002', droneCode: 'DRONE-002', missionCode: 'mission-002', severity: 'WARNING', sourceGroup: 'Components' },
      { alertCode: 'DEMO-ALT-003', droneCode: 'DRONE-005', missionCode: 'mission-005', severity: 'CRITICAL', sourceGroup: 'Weather' },
    ]);
    expect(alertSamples.every(alert => alert.problemDescription.length > 0 && alert.problemDescription.length < 90)).toBe(true);
    expect(alertsByCode.has('ALT-001')).toBe(false);
  });

  it('puts critical incidents first even when older, then newest warning and stable code', () => {
    expect(alerts.map(alert => alert.alertCode)).toEqual(['DEMO-ALT-003', 'DEMO-ALT-002', 'DEMO-ALT-001']);
    const sample = alertSamples[0];
    expect(compareAlertPriority({ ...sample, severity: 'CRITICAL' }, sample)).toBeLessThan(0);
    expect(compareAlertPriority({ ...sample, detectedAt: '2026-10-22 06:05:00.000' }, sample)).toBeLessThan(0);
    expect(compareAlertPriority(sample, { ...sample, alertCode: 'DEMO-ALT-999' })).toBeLessThan(0);
    expect(compareAlertPriority(sample, sample)).toBe(0);
  });

  it('uses fixed UTC instants and the shared ICT presentation', () => {
    expect(alertsByCode.get('DEMO-ALT-001')?.detectedTime).toEqual({
      iso: '2026-10-21T06:05:00.000Z', text: '21 Oct 2026, 13:05:00 ICT',
    });
    expect(alertsByCode.get('DEMO-ALT-003')?.detectedTime).toEqual({
      iso: '2026-10-19T06:10:00.000Z', text: '19 Oct 2026, 13:10:00 ICT',
    });
  });
});
