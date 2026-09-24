import { describe, expect, it } from 'vitest';
import { weatherLocations, worstRecommendation } from '../src/modules/weather';

describe('weather route checks', () => {
  it('uses the worst recommendation', () => {
    expect(worstRecommendation(['SAFE', 'CAUTION', 'SAFE'])).toBe('CAUTION');
    expect(worstRecommendation(['CAUTION', 'UNSAFE'])).toBe('UNSAFE');
    expect(worstRecommendation(['SAFE'])).toBe('SAFE');
  });

  it('samples start, distance midpoint and destination', () => {
    const locations = weatherLocations([
      { id: 1, sequence_number: 1, latitude: 0, longitude: 0 },
      { id: 2, sequence_number: 2, latitude: 0, longitude: 2 },
      { id: 3, sequence_number: 3, latitude: 0, longitude: 10 },
    ] as never);
    expect(locations.map((location) => location.type)).toEqual(['START', 'ROUTE_MIDPOINT', 'DESTINATION']);
    expect(locations[1]?.longitude).toBeCloseTo(5, 4);
    expect(locations[1]?.waypointId).toBeNull();
  });
});
