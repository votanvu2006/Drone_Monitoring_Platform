import { weatherProfiles } from '../../data/seeds';
import type { Tone } from '../../components/ui';

export interface WeatherPoint { point: string; profileCode: string; status: 'SAFE' | 'CAUTION' | 'UNSAFE'; tone: Tone; summary: string; sampleLabel: string }
const routeSamples = [ ['Departure','DEMO_SAFE'], ['Midpoint','DEMO_CAUTION'], ['Destination','DEMO_SAFE'] ] as const;
export const weatherExamples: readonly WeatherPoint[] = routeSamples.map(([point,profileCode],index) => {
  const profile = weatherProfiles.find(item => item.profile_code === profileCode);
  if (!profile) throw new Error('Missing weather demo profile ' + profileCode);
  const status = profile.recommendation;
  if (status !== 'SAFE' && status !== 'CAUTION' && status !== 'UNSAFE') throw new Error('Unknown weather demo recommendation');
  const tone: Tone = status === 'SAFE' ? 'success' : status === 'CAUTION' ? 'warning' : 'danger';
  return { point, profileCode, status, tone, sampleLabel: 'ROUTE SAMPLE ' + String(index + 1).padStart(2,'0'),
    summary: 'Wind ' + profile.wind_speed_10m_mps + ' m/s, with visibility of ' + profile.visibility_m / 1000 + ' km. ' + profile.reason };
});
