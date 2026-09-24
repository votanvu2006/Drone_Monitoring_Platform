import { describe, expect, it } from 'vitest';
import { pointInPolygon, validateRoute } from '../src/modules/airspace';

const square = [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]] as [number, number][];

describe('airspace validation', () => {
  it('includes polygon boundaries', () => {
    expect(pointInPolygon([0, 5], square)).toBe(true);
    expect(pointInPolygon([5, 5], square)).toBe(true);
    expect(pointInPolygon([11, 5], square)).toBe(false);
  });

  it('finds a route segment crossing a restricted polygon', () => {
    const waypoints = [
      { id: 1, sequence_number: 1, waypoint_type: 'START', latitude: 5, longitude: 1, altitude_m: 50 },
      { id: 2, sequence_number: 2, waypoint_type: 'DESTINATION', latitude: 5, longitude: 9, altitude_m: 50 },
    ];
    const zones = [
      { id: 1, zone_code: 'A', name: 'Allowed', zone_type: 'ALLOWED', boundary_geojson: { type: 'Polygon', coordinates: [square] }, min_altitude_m: null, max_altitude_m: null, reason: null, data_authority: 'DEMO_ONLY', display_color: '#000000' },
      { id: 2, zone_code: 'R', name: 'Restricted', zone_type: 'RESTRICTED', boundary_geojson: { type: 'Polygon', coordinates: [[[4, 4], [6, 4], [6, 6], [4, 6], [4, 4]]] }, min_altitude_m: null, max_altitude_m: null, reason: null, data_authority: 'DEMO_ONLY', display_color: '#ff0000' },
    ];
    expect(validateRoute(waypoints as never, zones as never)).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'RESTRICTED_ZONE', zoneCode: 'R' }),
    ]));
  });

  it('accepts an ordered route in allowed airspace', () => {
    const waypoints = [
      { id: 1, sequence_number: 1, waypoint_type: 'START', latitude: 2, longitude: 2, altitude_m: 50 },
      { id: 2, sequence_number: 2, waypoint_type: 'DESTINATION', latitude: 3, longitude: 3, altitude_m: 50 },
    ];
    const zones = [{ id: 1, zone_code: 'A', name: 'Allowed', zone_type: 'ALLOWED', boundary_geojson: { type: 'Polygon', coordinates: [square] }, min_altitude_m: null, max_altitude_m: null, reason: null, data_authority: 'DEMO_ONLY', display_color: '#000000' }];
    expect(validateRoute(waypoints as never, zones as never)).toEqual([]);
  });
});
