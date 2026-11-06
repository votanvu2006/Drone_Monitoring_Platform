export function buildSnapshot(tables) {
  const num = value => value === null || value === undefined ? null : Number(value);
  const iso = value => value ? new Date(String(value).replace(' ', 'T').replace(/Z$/, '') + 'Z').toISOString() : null;
  const models = new Map(tables.drone_models.map(item => [Number(item.id), item]));
  const drones = new Map(tables.drones.map(item => [Number(item.id), item]));
  const missions = new Map(tables.missions.map(item => [Number(item.id), item]));
  const catalog = new Map(tables.component_catalog.map(item => [Number(item.id), item]));
  const installed = new Map(tables.drone_components.map(item => [Number(item.id), item]));
  const pointsFor = id => tables.waypoints.filter(item => Number(item.mission_id) === Number(id))
    .sort((a, b) => Number(a.sequence_number) - Number(b.sequence_number))
    .map(item => ({ code: `WP-${String(item.sequence_number).padStart(2, '0')}`, label: item.waypoint_type === 'START' ? 'Launch' : item.waypoint_type === 'DESTINATION' ? 'Return' : `Waypoint ${String(item.sequence_number).padStart(2, '0')}`, x: num(item.map_x), y: num(item.map_y) }));
  const findings = tables.component_findings.map(item => ({
    id: item.finding_code, droneCode: drones.get(Number(item.drone_id)).drone_code,
    missionCode: missions.get(Number(item.mission_id)).mission_code,
    componentCode: catalog.get(Number(installed.get(Number(item.component_id)).component_catalog_id)).component_code,
    severity: item.severity, detectedAt: iso(item.detected_at),
  }));
  const fleet = { drones: tables.drones.map(drone => ({
    code: drone.drone_code, modelName: models.get(Number(drone.drone_model_id)).model_name,
    status: drone.status, homeBase: drone.home_location_label,
    lastKnownLocation: drone.last_known_location_label,
    activeMission: tables.missions.find(item => Number(item.drone_id) === Number(drone.id) && ['RUNNING', 'IN_PROGRESS'].includes(item.status))?.mission_code ?? null,
  })), findings };
  const details = tables.drones.map(drone => {
    const model = models.get(Number(drone.drone_model_id));
    return { code: drone.drone_code, serialNumber: drone.serial_number, status: drone.status,
      isActivated: drone.status !== 'OFFLINE', manufacturer: model.manufacturer, modelName: model.model_name,
      modelCode: model.model_code, maxSpeedMps: num(model.max_speed_mps), maxFlightTimeMinutes: num(model.max_flight_time_minutes),
      components: tables.drone_components.filter(item => Number(item.drone_id) === Number(drone.id) && Number(item.installed)).map(item => {
        const part = catalog.get(Number(item.component_catalog_id));
        return { code: part.component_code, type: part.component_type, name: part.name, position: part.position,
          model: part.model, primaryFunction: part.primary_function, serialNumber: item.component_serial_number, healthStatus: item.health_status };
      }), findings: findings.filter(item => item.droneCode === drone.drone_code),
    };
  });
  const missionList = tables.missions.filter(item => Number(item.is_current)).map(item => ({
    id: item.mission_code, name: item.name, droneCode: drones.get(Number(item.drone_id)).drone_code,
    status: item.status === 'RUNNING' ? 'IN_PROGRESS' : item.status,
    waypointCount: pointsFor(item.id).length, createdAt: iso(item.created_at),
  }));
  const activeFlights = tables.flights.filter(item => ['FLYING', 'PAUSED', 'RETURNING'].includes(item.status)).map(item => ({
    flightCode: item.flight_code, missionCode: missions.get(Number(item.mission_id)).mission_code,
    droneCode: drones.get(Number(item.drone_id)).drone_code, flightStatus: 'IN_PROGRESS',
    routeName: item.route_name, currentWaypointIndex: Number(item.current_waypoint_index), waypoints: pointsFor(item.mission_id),
  }));
  const historyDetails = tables.flights.filter(item => item.ended_at && item.result).map(item => {
    const samples = tables.telemetry.filter(sample => Number(sample.flight_id) === Number(item.id));
    return { flightCode: item.flight_code, droneCode: drones.get(Number(item.drone_id)).drone_code,
      missionCode: missions.get(Number(item.mission_id)).mission_code, status: item.result === 'FAILED' ? 'FAILED' : 'COMPLETED',
      startedAt: iso(item.started_at), durationSeconds: Number(item.duration_sec), routeName: item.route_name,
      waypoints: pointsFor(item.mission_id).map(({ code, x, y }) => ({ code, x, y })),
      telemetry: { startBatteryPercent: num(item.start_battery_percent), endBatteryPercent: num(item.end_battery_percent),
        maxAltitudeMeters: Math.max(0, ...samples.map(sample => Number(sample.altitude_m))),
        averageSpeedMps: Number((samples.reduce((sum, sample) => sum + Number(sample.speed_mps), 0) / samples.length).toFixed(2)), distanceMeters: num(item.distance_m) },
      events: tables.flight_events.filter(event => Number(event.flight_id) === Number(item.id)).map(event => ({
        id: event.event_code, occurredAt: iso(event.occurred_at), title: event.title, description: event.description, severity: event.severity,
      })).sort((a, b) => a.occurredAt.localeCompare(b.occurredAt)),
    };
  }).sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  const history = historyDetails.map(({ flightCode, droneCode, missionCode, status, startedAt, durationSeconds }) => ({ flightCode, droneCode, missionCode, status, startedAt, durationSeconds }));
  const alerts = tables.alerts.map(item => ({ alertCode: item.alert_code, title: item.title,
    droneCode: drones.get(Number(missions.get(Number(item.mission_id)).drone_id)).drone_code,
    missionCode: missions.get(Number(item.mission_id)).mission_code, problemDescription: item.message,
    severity: item.severity, sourceGroup: item.source_group, detectedAt: String(item.detected_at).replace(/\.0+$/, ''), resolutionNote: item.resolution_note,
  }));
  return { metadata: { buildId: tables.data_pack_metadata[0].build_id, runCode: tables.demo_runs[0].run_code }, fleet, details, missions: missionList, activeFlights, history, historyDetails, alerts };
}
