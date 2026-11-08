export const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'Drone Monitoring Platform API',
    version: '0.2.0',
    description: 'Backend APIs for fleet, missions, flight operations and alerts.',
  },
  servers: [{ url: '/api' }],
  tags: [
    { name: 'Fleet' }, { name: 'Mission' }, { name: 'Flight Operations' }, { name: 'Alerts' },
  ],
  paths: {
    '/drones': {
      get: {
        tags: ['Fleet'],
        summary: 'List drones with pagination and an optional status filter',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
          { name: 'pageSize', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 25 } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['AVAILABLE', 'IN_FLIGHT', 'MAINTENANCE', 'OFFLINE'] } },
        ],
        responses: {
          '200': { description: 'Paginated drone list', content: { 'application/json': { schema: { $ref: '#/components/schemas/DroneListResponse' } } } },
          '400': { description: 'Invalid pagination or status filter', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/drones/{droneCode}': {
      get: {
        tags: ['Fleet'],
        summary: 'Get a drone with its installed components and findings',
        parameters: [{
          name: 'droneCode',
          in: 'path',
          required: true,
          schema: { type: 'string', pattern: '^[A-Za-z0-9_-]{1,30}$' },
        }],
        responses: {
          '200': {
            description: 'Drone details',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/DroneDetailResponse' } } },
          },
          '400': {
            description: 'Invalid drone code',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
          '404': {
            description: 'Drone not found',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
    },
    '/drones/{droneCode}/power': {
      patch: {
        tags: ['Fleet'],
        summary: 'Switch a demo drone power state',
        description:
          'R5 demo: powering on DRONE-002 enters maintenance; powering on DRONE-003 starts its ready mission and flight. An in-flight or maintenance drone cannot be switched off.',
        parameters: [{
          name: 'droneCode',
          in: 'path',
          required: true,
          schema: { type: 'string', pattern: '^[A-Za-z0-9_-]{1,30}$' },
        }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['isOn'],
                properties: {
                  isOn: { type: 'boolean' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Persisted drone power and status' },
          '400': { description: 'Invalid drone code or isOn value' },
          '404': { description: 'Drone not found' },
          '409': { description: 'Unsafe power transition or changed drone state' },
        },
      },
    },
    '/missions': {
      get: {
        tags: ['Mission'],
        summary: 'List current missions with pagination and optional drone and status filters',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
          { name: 'pageSize', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 25 } },
          { name: 'droneId', in: 'query', schema: { type: 'integer', minimum: 1 } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['DRAFT', 'READY', 'RUNNING', 'WARNING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED'] } },
        ],
        responses: {
          '200': { description: 'Paginated current mission list', content: { 'application/json': { schema: { $ref: '#/components/schemas/MissionListResponse' } } } },
          '400': { description: 'Invalid pagination or filter', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/missions/{missionId}': {
      get: {
        tags: ['Mission'],
        summary: 'Get a current or historical mission with its assigned drone and ordered waypoints',
        parameters: [{ $ref: '#/components/parameters/MissionId' }],
        responses: {
          '200': { description: 'Mission details', content: { 'application/json': { schema: { $ref: '#/components/schemas/MissionDetailResponse' } } } },
          '400': { description: 'Invalid mission ID', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '404': { description: 'Mission not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/flights/active': {
      get: {
        tags: ['Flight Operations'], summary: 'Read active flights for powered-on drones; READY flights are excluded',
        responses: { '200': { description: 'Active flights', content: { 'application/json': { schema: {
          type: 'object', properties: { data: { type: 'array', items: { $ref: '#/components/schemas/ActiveFlight' } } },
        } } } } },
      },
    },
    '/flights/history': {
      get: {
        tags: ['Flight Operations'], summary: 'Read ended flights for powered-on drones; blocked preflight attempts have no history record',
        responses: { '200': { description: 'Flight history', content: { 'application/json': { schema: {
          type: 'object', properties: { data: { type: 'array', items: { $ref: '#/components/schemas/FlightHistoryRecord' } } },
        } } } } },
      },
    },
    '/flights/{flightCode}': {
      get: {
        tags: ['Flight Operations'], summary: 'Read a historical flight with route, telemetry summary and ordered events',
        parameters: [{ name: 'flightCode', in: 'path', required: true, schema: { type: 'string', pattern: '^[a-zA-Z0-9-]{1,30}$' } }],
        responses: {
          '200': { description: 'Flight details', content: { 'application/json': { schema: { type: 'object', properties: {
            data: { $ref: '#/components/schemas/FlightHistoryDetail' },
          } } } } },
          '400': { description: 'Invalid flight code' }, '404': { description: 'Historical flight not found or its drone is OFFLINE' },
        },
      },
    },
    '/flights': {
      get: {
        tags: ['Flight Operations'],
        summary: 'List flight attempts for powered-on drones with pagination and optional filters',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
          { name: 'pageSize', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 25 } },
          { name: 'droneId', in: 'query', schema: { type: 'integer', minimum: 1 } },
          { name: 'missionId', in: 'query', schema: { type: 'integer', minimum: 1 } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['READY', 'FLYING', 'PAUSED', 'RETURNING', 'LANDED', 'ABORTED'] } },
          { name: 'result', in: 'query', schema: { type: 'string', enum: ['SUCCESS', 'RETURNED_SAFELY', 'FAILED'] } },
        ],
        responses: {
          '200': { description: 'Paginated flight list', content: { 'application/json': { schema: { $ref: '#/components/schemas/FlightListResponse' } } } },
          '400': { description: 'Invalid pagination or filter', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/alerts': {
      get: {
        tags: ['Alerts'], summary: 'List and filter alerts',
        parameters: [
          { name: 'droneCode', in: 'query', schema: { type: 'string' } },
          { name: 'missionCode', in: 'query', schema: { type: 'string' } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['ACTIVE', 'RESOLVED'] } },
          { name: 'severity', in: 'query', schema: { type: 'string', enum: ['WARNING', 'CRITICAL'] } },
          { name: 'source', in: 'query', schema: { type: 'string', enum: ['ROUTE', 'WEATHER', 'TELEMETRY', 'SYSTEM'] } },
          { name: 'flightId', in: 'query', schema: { type: 'integer', minimum: 1 } },
          { name: 'missionId', in: 'query', schema: { type: 'integer', minimum: 1 } },
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
          { name: 'pageSize', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 25 } },
        ],
        responses: { '200': { description: 'Paginated v2.1.0 alerts, including title, source_group, drone_code, mission_code, component_code, lifecycle and incident details. flight_id may be null for blocked preflight alerts.' }, '400': { description: 'Invalid pagination or filters' } },
      },
    },
    '/alerts/{id}/resolve': {
      patch: {
        tags: ['Alerts'], summary: 'Resolve an active alert', parameters: [{ $ref: '#/components/parameters/Id' }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ResolveAlert' } } } },
        responses: { '200': { description: 'Resolved alert' }, '409': { $ref: '#/components/responses/Conflict' } },
      },
    },
  },
  components: {
    parameters: {
      Id: { name: 'id', in: 'path', required: true, schema: { type: 'integer', minimum: 1 } },
      MissionId: { name: 'missionId', in: 'path', required: true, schema: { type: 'integer', minimum: 1 } },
    },
    schemas: {
      FlightDroneSummary: {
        type: 'object',
        required: ['id', 'droneCode', 'displayName'],
        properties: {
          id: { type: 'integer', format: 'int64' },
          droneCode: { type: 'string' },
          displayName: { type: 'string' },
        },
      },
      FlightMissionSummary: {
        type: 'object',
        required: ['id', 'missionCode', 'name'],
        properties: {
          id: { type: 'integer', format: 'int64' },
          missionCode: { type: 'string' },
          name: { type: 'string' },
        },
      },
      FlightMapWaypoint: {
        type: 'object', properties: { code: { type: 'string' }, label: { type: 'string' },
          x: { type: 'number', nullable: true }, y: { type: 'number', nullable: true } },
      },
      ActiveFlight: {
        type: 'object', properties: {
          flightCode: { type: 'string' }, missionCode: { type: 'string' }, droneCode: { type: 'string' },
          flightStatus: { type: 'string', enum: ['IN_PROGRESS'] }, status: { type: 'string', enum: ['FLYING', 'PAUSED', 'RETURNING'] },
          routeName: { type: 'string' }, currentWaypointIndex: { type: 'integer', minimum: 0 },
          routeProgressPercent: { type: 'integer', minimum: 0, maximum: 100 },
          waypoints: { type: 'array', items: { $ref: '#/components/schemas/FlightMapWaypoint' } },
        },
      },
      FlightHistoryRecord: {
        type: 'object', properties: {
          flightCode: { type: 'string' }, missionCode: { type: 'string' }, droneCode: { type: 'string' },
          status: { type: 'string', enum: ['COMPLETED', 'FAILED'] },
          startedAt: { type: 'string', format: 'date-time', nullable: true, description: 'UTC instant' },
          durationSeconds: { type: 'integer', minimum: 0 },
        },
      },
      FlightHistoryDetail: {
        allOf: [{ $ref: '#/components/schemas/FlightHistoryRecord' }, {
          type: 'object', properties: {
            routeName: { type: 'string' },
            waypoints: { type: 'array', items: { $ref: '#/components/schemas/FlightMapWaypoint' } },
            telemetry: { type: 'object', properties: {
              startBatteryPercent: { type: 'number', nullable: true }, endBatteryPercent: { type: 'number', nullable: true },
              maxAltitudeMeters: { type: 'number', nullable: true }, averageSpeedMps: { type: 'number', nullable: true },
              distanceMeters: { type: 'number' },
            } },
            events: { type: 'array', items: { type: 'object', properties: {
              id: { type: 'string' }, occurredAt: { type: 'string', format: 'date-time' },
              title: { type: 'string' }, description: { type: 'string' }, severity: { enum: ['INFO', 'WARNING', 'ERROR'] },
            } } },
          },
        }],
      },
      FlightListItem: {
        type: 'object',
        required: [
          'id', 'flightCode', 'status', 'result', 'drone', 'mission', 'scenarioCode',
          'startedAt', 'endedAt', 'durationSec', 'distanceM',
        ],
        properties: {
          id: { type: 'integer', format: 'int64' },
          flightCode: { type: 'string' },
          status: { type: 'string', enum: ['READY', 'FLYING', 'PAUSED', 'RETURNING', 'LANDED', 'ABORTED'] },
          result: { type: 'string', enum: ['SUCCESS', 'RETURNED_SAFELY', 'FAILED'], nullable: true },
          drone: { $ref: '#/components/schemas/FlightDroneSummary' },
          mission: { $ref: '#/components/schemas/FlightMissionSummary' },
          scenarioCode: { type: 'string' },
          startedAt: {
            type: 'string', nullable: true,
            description: 'Stored database DATETIME(3) in YYYY-MM-DD HH:mm:ss.ffffff format; no timezone is implied.',
          },
          endedAt: {
            type: 'string', nullable: true,
            description: 'Stored database DATETIME(3) in YYYY-MM-DD HH:mm:ss.ffffff format; no timezone is implied.',
          },
          durationSec: { type: 'integer', minimum: 0 },
          distanceM: { type: 'number', minimum: 0 },
        },
      },
      FlightListResponse: {
        type: 'object',
        required: ['data', 'page', 'pageSize', 'total'],
        properties: {
          data: { type: 'array', items: { $ref: '#/components/schemas/FlightListItem' } },
          page: { type: 'integer' },
          pageSize: { type: 'integer' },
          total: { type: 'integer' },
        },
      },
      MissionWaypoint: {
        type: 'object',
        required: ['id', 'sequenceNumber', 'waypointType', 'latitude', 'longitude', 'altitudeM', 'holdTimeSec'],
        properties: {
          id: { type: 'integer', format: 'int64' },
          sequenceNumber: { type: 'integer', minimum: 1 },
          waypointType: { type: 'string', enum: ['START', 'INTERMEDIATE', 'DESTINATION'] },
          latitude: { type: 'number', minimum: -90, maximum: 90 },
          longitude: { type: 'number', minimum: -180, maximum: 180 },
          altitudeM: { type: 'number' },
          holdTimeSec: { type: 'integer', minimum: 0 },
        },
      },
      MissionDetail: {
        type: 'object',
        required: [
          'id', 'missionCode', 'name', 'description', 'drone', 'status', 'validationStatus',
          'validationMessage', 'plannedAltitudeM', 'plannedSpeedMps', 'estimatedDistanceM',
          'estimatedDurationSec', 'progressPercent', 'createdAt', 'updatedAt', 'waypoints',
        ],
        properties: {
          id: { type: 'integer', format: 'int64' },
          missionCode: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string', nullable: true },
          drone: {
            type: 'object',
            required: ['id', 'droneCode', 'displayName'],
            properties: {
              id: { type: 'integer', format: 'int64' },
              droneCode: { type: 'string' },
              displayName: { type: 'string' },
            },
          },
          status: { type: 'string', enum: ['DRAFT', 'READY', 'RUNNING', 'WARNING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED'] },
          validationStatus: { type: 'string', enum: ['NOT_CHECKED', 'VALID', 'INVALID'] },
          validationMessage: { type: 'string', nullable: true },
          plannedAltitudeM: { type: 'number' },
          plannedSpeedMps: { type: 'number' },
          estimatedDistanceM: { type: 'number', minimum: 0 },
          estimatedDurationSec: { type: 'integer', minimum: 0 },
          progressPercent: { type: 'integer', minimum: 0, maximum: 100 },
          createdAt: { type: 'string', description: 'Stored database DATETIME in YYYY-MM-DD HH:mm:ss format.' },
          updatedAt: { type: 'string', description: 'Stored database DATETIME in YYYY-MM-DD HH:mm:ss format.' },
          waypoints: { type: 'array', items: { $ref: '#/components/schemas/MissionWaypoint' } },
        },
      },
      MissionDetailResponse: {
        type: 'object',
        required: ['data'],
        properties: { data: { $ref: '#/components/schemas/MissionDetail' } },
      },
      MissionListItem: {
        type: 'object',
        required: [
          'id', 'missionCode', 'name', 'drone', 'status', 'validationStatus',
          'progressPercent', 'estimatedDistanceM', 'waypointCount', 'createdAt',
        ],
        properties: {
          id: { type: 'integer', format: 'int64' },
          missionCode: { type: 'string' },
          name: { type: 'string' },
          drone: {
            type: 'object',
            required: ['id', 'droneCode', 'displayName'],
            properties: {
              id: { type: 'integer', format: 'int64' },
              droneCode: { type: 'string' },
              displayName: { type: 'string' },
            },
          },
          status: { type: 'string', enum: ['DRAFT', 'READY', 'RUNNING', 'WARNING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED'] },
          validationStatus: { type: 'string', enum: ['NOT_CHECKED', 'VALID', 'INVALID'] },
          progressPercent: { type: 'integer', minimum: 0, maximum: 100 },
          estimatedDistanceM: { type: 'number', minimum: 0 },
          waypointCount: { type: 'integer', minimum: 0 },
          createdAt: { type: 'string', description: 'Stored database DATETIME in YYYY-MM-DD HH:mm:ss format.' },
        },
      },
      MissionListResponse: {
        type: 'object',
        required: ['data', 'page', 'pageSize', 'total'],
        properties: {
          data: { type: 'array', items: { $ref: '#/components/schemas/MissionListItem' } },
          page: { type: 'integer' },
          pageSize: { type: 'integer' },
          total: { type: 'integer' },
        },
      },
      HomeLocation: {
        type: 'object', required: ['label', 'latitude', 'longitude'],
        properties: {
          label: { type: 'string' },
          latitude: { type: 'number' },
          longitude: { type: 'number' },
        },
      },
      LastKnownLocation: {
        type: 'object', nullable: true,
        required: ['label', 'latitude', 'longitude', 'altitudeM', 'source', 'updatedAt'],
        properties: {
          label: { type: 'string', nullable: true },
          latitude: { type: 'number' },
          longitude: { type: 'number' },
          altitudeM: { type: 'number', nullable: true },
          source: { type: 'string', enum: ['BROWSER_GEOLOCATION', 'DEVICE_GPS', 'FLIGHT_TELEMETRY', 'HOME_BASE', 'MANUAL', 'UNKNOWN'] },
          updatedAt: { type: 'string', format: 'date-time', nullable: true },
        },
      },
      ComponentFinding: {
        type: 'object',
        required: ['id', 'droneCode', 'missionCode', 'componentCode', 'severity', 'detectedAt'],
        properties: {
          id: { type: 'string' },
          droneCode: { type: 'string' },
          missionCode: { type: 'string' },
          componentCode: { type: 'string' },
          severity: { type: 'string', enum: ['WARNING', 'FAULT'] },
          detectedAt: { type: 'string', format: 'date-time' },
        },
      },
      DroneListItem: {
        type: 'object',
        required: [
          'id', 'droneCode', 'displayName', 'status', 'batteryPercent',
          'isSimulated', 'model', 'homeLocation', 'lastKnownLocation',
          'activeMission', 'findings',
        ],
        properties: {
          id: { type: 'integer', format: 'int64' },
          droneCode: { type: 'string' },
          displayName: { type: 'string' },
          status: { type: 'string', enum: ['AVAILABLE', 'IN_FLIGHT', 'MAINTENANCE', 'OFFLINE'] },
          batteryPercent: { type: 'number', minimum: 0, maximum: 100 },
          isSimulated: { type: 'boolean' },
          model: {
            type: 'object',
            required: ['modelCode', 'manufacturer', 'modelName'],
            properties: {
              modelCode: { type: 'string' },
              manufacturer: { type: 'string' },
              modelName: { type: 'string' },
            },
          },
          homeLocation: { $ref: '#/components/schemas/HomeLocation' },
          lastKnownLocation: { $ref: '#/components/schemas/LastKnownLocation' },
          activeMission: { type: 'string', nullable: true },
          findings: { type: 'array', items: { $ref: '#/components/schemas/ComponentFinding' } },
        },
      },
      DroneListResponse: {
        type: 'object',
        required: ['data', 'page', 'pageSize', 'total'],
        properties: {
          data: { type: 'array', items: { $ref: '#/components/schemas/DroneListItem' } },
          page: { type: 'integer' },
          pageSize: { type: 'integer' },
          total: { type: 'integer' },
        },
      },
      InstalledDroneComponent: {
        type: 'object',
        required: [
          'code', 'type', 'name', 'position', 'model',
          'primaryFunction', 'serialNumber', 'healthStatus',
        ],
        properties: {
          code: { type: 'string' },
          type: { type: 'string' },
          name: { type: 'string' },
          position: { type: 'string' },
          model: { type: 'string' },
          primaryFunction: { type: 'string' },
          serialNumber: { type: 'string' },
          healthStatus: { type: 'string', enum: ['HEALTHY', 'WARNING', 'FAULT', 'MAINTENANCE'] },
        },
      },
      DroneDetailResponse: {
        type: 'object',
        required: ['data'],
        properties: {
          data: {
            type: 'object',
            required: [
              'code', 'status', 'isActivated', 'batteryPercent', 'serialNumber',
              'manufacturer', 'modelName', 'modelCode', 'maxSpeedMps',
              'maxFlightTimeMinutes', 'components', 'findings',
            ],
            properties: {
              code: { type: 'string' },
              status: { type: 'string', enum: ['AVAILABLE', 'IN_FLIGHT', 'MAINTENANCE', 'OFFLINE'] },
              isActivated: { type: 'boolean' },
              batteryPercent: { type: 'number', minimum: 0, maximum: 100 },
              serialNumber: { type: 'string' },
              manufacturer: { type: 'string' },
              modelName: { type: 'string' },
              modelCode: { type: 'string' },
              maxSpeedMps: { type: 'number' },
              maxFlightTimeMinutes: { type: 'number' },
              components: {
                type: 'array',
                items: { $ref: '#/components/schemas/InstalledDroneComponent' },
              },
              findings: {
                type: 'array',
                items: { $ref: '#/components/schemas/ComponentFinding' },
              },
            },
          },
        },
      },
      ResolveAlert: {
        type: 'object', required: ['resolutionNote'],
        properties: {
          resolutionNote: { type: 'string', maxLength: 500 },
          componentHealthStatus: { type: 'string', enum: ['HEALTHY', 'WARNING', 'FAULT', 'MAINTENANCE'] },
        },
      },
      Error: {
        type: 'object', properties: { error: { type: 'object', properties: { code: { type: 'string' }, message: { type: 'string' }, details: {} } } },
      },
    },
    responses: {
      NotFound: { description: 'Resource not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
      Conflict: { description: 'Operation conflicts with current state', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
    },
  },
} as const;