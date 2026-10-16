export type DroneStatus = 'AVAILABLE' | 'IN_FLIGHT' | 'MAINTENANCE' | 'OFFLINE';
export type MissionStatus = 'DRAFT' | 'READY' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
export type FlightStatus = 'READY' | 'FLYING' | 'PAUSED' | 'RETURNING' | 'LANDED' | 'ABORTED';
export type FlightResult = 'SUCCESS' | 'RETURNED_SAFELY' | 'FAILED';
export type AlertStatus = 'ACTIVE' | 'RESOLVED';
export type Recommendation = 'SAFE' | 'CAUTION' | 'UNSAFE';

export interface Page<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface Drone {
  id: number;
  droneCode: string;
  displayName: string;
  status: DroneStatus;
  isSimulated: boolean;
  model: { modelCode: string; manufacturer: string; modelName: string };
  homeLocation: { label: string; latitude: number; longitude: number };
  lastKnownLocation: {
    label: string | null;
    latitude: number;
    longitude: number;
    altitudeM: number | null;
    source: string;
    updatedAt: string | null;
  } | null;
}

export interface Waypoint {
  id: number;
  sequenceNumber: number;
  waypointType: 'START' | 'INTERMEDIATE' | 'DESTINATION';
  latitude: number;
  longitude: number;
  altitudeM: number;
  holdTimeSec: number;
}

export interface Mission {
  id: number;
  missionCode: string;
  name: string;
  drone: { id: number; droneCode: string; displayName: string };
  status: MissionStatus;
  validationStatus: 'NOT_CHECKED' | 'VALID' | 'INVALID';
  progressPercent: number;
  estimatedDistanceM: number;
  createdAt: string;
}

export interface MissionDetail extends Mission {
  description: string | null;
  validationMessage: string | null;
  plannedAltitudeM: number;
  plannedSpeedMps: number;
  estimatedDurationSec: number;
  updatedAt: string;
  waypoints: Waypoint[];
}

export interface Flight {
  id: number;
  flightCode: string;
  status: FlightStatus;
  result: FlightResult | null;
  drone: { id: number; droneCode: string; displayName: string };
  mission: { id: number; missionCode: string; name: string };
  scenarioCode: string;
  startedAt: string | null;
  endedAt: string | null;
  durationSec: number;
  distanceM: number;
}

export interface Telemetry {
  sequence_number: number;
  recorded_at: string;
  received_at: string | null;
  latitude: number;
  longitude: number;
  position_source: string;
  position_is_valid: boolean | number;
  transmission_state: 'CONNECTED' | 'DEGRADED' | 'LOST' | 'BUFFERED';
  heartbeat_age_seconds: number;
  altitude_m: number;
  speed_mps: number;
  vertical_speed_mps: number;
  heading_deg: number;
  battery_percent: number;
  battery_voltage_v: number;
  battery_current_a: number;
  battery_temperature_c: number;
  gps_quality: 'GOOD' | 'FAIR' | 'POOR' | 'LOST';
  gps_satellites: number;
  signal_percent: number;
  wind_speed_mps: number;
  wind_direction_deg: number;
}

export interface SimulationStatus {
  flight: {
    id: number;
    flight_code: string;
    status: FlightStatus;
    result: FlightResult | null;
    mission_id: number;
    drone_id: number;
    preflight_weather_recommendation: Recommendation;
    weather_acknowledged_at: string | null;
    started_at: string | null;
    ended_at: string | null;
    duration_sec: number;
    distance_m: number;
  };
  latestTelemetry: Telemetry | null;
  timerActive: boolean;
}

export interface FlightZone {
  type: 'Feature';
  properties: {
    id: number;
    zoneCode: string;
    name: string;
    zoneType: 'ALLOWED' | 'RESTRICTED';
    minAltitudeM: number | null;
    maxAltitudeM: number | null;
    reason: string | null;
    dataAuthority: 'DEMO_ONLY' | 'OFFICIAL';
    displayColor: string;
  };
  geometry: { type: 'Polygon'; coordinates: number[][][] };
}

export interface Alert {
  id: number;
  alert_code: string;
  flight_id: number | null;
  mission_id: number | null;
  component_id: number | null;
  source: 'ROUTE' | 'WEATHER' | 'TELEMETRY' | 'SYSTEM';
  rule_code: string;
  severity: 'WARNING' | 'CRITICAL';
  type: string;
  message: string;
  metric_name: string | null;
  observed_value: number | null;
  threshold_value: number | null;
  unit: string | null;
  status: AlertStatus;
  detected_at: string;
  last_observed_at: string;
  resolved_at: string | null;
  resolution_note: string | null;
}

export interface WeatherSample {
  type: 'START' | 'ROUTE_MIDPOINT' | 'DESTINATION';
  latitude: number;
  longitude: number;
  recommendation: Recommendation;
  temperatureC: number;
  windSpeed10mMps: number;
  windGust10mMps: number;
  windDirection10mDeg: number;
  visibilityM: number;
  reason: string;
}

export interface WeatherCheck {
  validationRunId: string;
  missionId: number;
  recommendation: Recommendation;
  requiresAcknowledgement: boolean;
  launchAllowed: boolean;
  checkedAt: string;
  expiresAt: string;
  samples: WeatherSample[];
}

export interface ApiErrorBody {
  error?: { code?: string; message?: string };
}
