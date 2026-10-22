import { describe, expect, it } from 'vitest';
import { alertSeeds, droneSeeds, flightSeeds, missionSeeds } from './seeds';
import { mockSnapshot } from '../features/drones/inventory/droneInventory.data';
import { formatSeedTime, toUtcIso } from './format';

describe('canonical static data', () => {
  it('preserves complete records and canonical relationships', () => {
    expect(droneSeeds).toHaveLength(5);
    expect(mockSnapshot.drones.map(drone => drone.code)).toEqual(droneSeeds.map(drone => drone.drone_code));
    expect(mockSnapshot.drones.map(drone => drone.status)).toEqual(droneSeeds.map(drone => drone.status));
    expect(missionSeeds).toHaveLength(20);
    expect(alertSeeds).toHaveLength(24);
    expect(alertSeeds.filter(alert => alert.status === 'ACTIVE')).toHaveLength(6);
    for (const flight of flightSeeds) {
      expect(droneSeeds.some(drone => drone.id === flight.drone_id)).toBe(true);
      expect(missionSeeds.some(mission => mission.id === flight.mission_id)).toBe(true);
    }
  });
  it('formats seed DATETIME as UTC and renders stable ICT output', () => {
    expect(toUtcIso('2026-07-07 06:09:46.000')).toBe('2026-07-07T06:09:46.000Z');
    expect(formatSeedTime('2026-07-07 06:09:46.000')).toContain('13:09:46');
    expect(formatSeedTime(null)).toBe('Not recorded');
  });
});
