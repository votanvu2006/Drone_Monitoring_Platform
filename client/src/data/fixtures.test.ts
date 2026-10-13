import { describe, expect, it } from 'vitest';
import { activeFlight, alerts, drones, missions, recentActivity } from './fixtures';

describe('shared training examples', () => {
  it('keeps the active flight linked to the running mission and aircraft', () => {
    expect(drones).toHaveLength(5);
    expect(drones.find((drone) => drone.id === activeFlight.droneId)?.status).toBe('IN_FLIGHT');
    expect(missions.find((mission) => mission.id === activeFlight.missionId)?.status).toBe('RUNNING');
    expect(alerts.filter((alert) => alert.status === 'ACTIVE')).toHaveLength(2);
  });
  it('provides resolution notes for resolved alerts and links recent activity to examples', () => {
    alerts.filter((alert) => alert.status === 'RESOLVED').forEach((alert) => expect(alert.resolutionNote).toBeTruthy());
    expect(recentActivity.find((activity) => activity.id === 'activity-1')?.detail).toContain(alerts[0].id);
    expect(recentActivity.find((activity) => activity.id === 'activity-2')?.detail).toContain(activeFlight.id);
  });
});
