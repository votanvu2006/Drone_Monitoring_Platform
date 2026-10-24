import { droneSeeds, flightSeeds, missionSeeds, scenarioSeeds, weatherProfiles } from '../../data/seeds';
import type { IconName } from '../../components/Icon';
import type { Tone } from '../../components/ui';

export interface ScenarioExample { id: string; name: string; status: string; tone: Tone; icon: IconName; summary: string }
const normal = scenarioSeeds.find(item => item.scenario_code === 'NORMAL');
const battery = scenarioSeeds.find(item => item.scenario_code === 'BATTERY_VOLTAGE_DROP');
const restricted = missionSeeds.find(item => item.mission_code === 'MSN-003');
const caution = weatherProfiles.find(item => item.profile_code === 'DEMO_CAUTION');
if (!normal || !battery || !restricted || !caution) throw new Error('Missing canonical scenario preview records');

export const scenarioExamples: readonly ScenarioExample[] = [
  { id: normal.scenario_code, name: 'Successful flight', status: normal.expected_result, tone: 'success', icon: 'check', summary: normal.description },
  { id: battery.scenario_code, name: 'Component failure', status: battery.expected_result, tone: 'danger', icon: 'battery', summary: battery.description },
  { id: restricted.mission_code, name: 'Restricted-zone failure', status: 'BLOCKED', tone: 'danger', icon: 'shield', summary: restricted.validation_message },
  { id: caution.profile_code, name: 'Weather caution', status: caution.recommendation, tone: 'warning', icon: 'weather', summary: caution.reason },
];

const recordedFlight = flightSeeds[0];
export const previewFlightContext = recordedFlight ? {
  code: recordedFlight.flight_code, status: recordedFlight.status,
  missionName: missionSeeds.find(item => item.id === recordedFlight.mission_id)?.name ?? 'Mission not recorded',
  droneName: droneSeeds.find(item => item.id === recordedFlight.drone_id)?.display_name ?? 'Aircraft not recorded',
  duration: recordedFlight.duration_sec === null ? 'Not recorded' : recordedFlight.duration_sec + ' seconds',
} : null;
