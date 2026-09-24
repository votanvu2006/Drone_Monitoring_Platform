export const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'Drone Monitoring Platform API',
    version: '0.2.0',
    description: 'Backend APIs for fleet, mission planning, airspace, demo weather, flight simulation and alert lifecycle management.',
  },
  servers: [{ url: '/api' }],
  tags: [
    { name: 'Fleet' }, { name: 'Mission' }, { name: 'Airspace' }, { name: 'Weather' }, { name: 'Simulation' }, { name: 'Alerts' },
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
    '/missions': {
      get: {
        tags: ['Mission'],
        summary: 'List missions with pagination and optional drone and status filters',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
          { name: 'pageSize', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 25 } },
          { name: 'droneId', in: 'query', schema: { type: 'integer', minimum: 1 } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['DRAFT', 'READY', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED'] } },
        ],
        responses: {
          '200': { description: 'Paginated mission list', content: { 'application/json': { schema: { $ref: '#/components/schemas/MissionListResponse' } } } },
          '400': { description: 'Invalid pagination or filter', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/missions/{missionId}': {
      get: {
        tags: ['Mission'],
        summary: 'Get a mission with its assigned drone and ordered waypoints',
        parameters: [{ $ref: '#/components/parameters/MissionId' }],
        responses: {
          '200': { description: 'Mission details', content: { 'application/json': { schema: { $ref: '#/components/schemas/MissionDetailResponse' } } } },
          '400': { description: 'Invalid mission ID', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '404': { description: 'Mission not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/flight-zones': {
      get: { tags: ['Airspace'], summary: 'List active flight zones as GeoJSON', responses: { '200': { description: 'GeoJSON FeatureCollection' } } },
    },
    '/missions/{id}/validate': {
      post: {
        tags: ['Airspace'], summary: 'Validate a persisted mission route',
        parameters: [{ $ref: '#/components/parameters/Id' }],
        responses: { '200': { description: 'Route validation result' }, '404': { $ref: '#/components/responses/NotFound' } },
      },
    },
    '/weather/current': {
      get: {
        tags: ['Weather'], summary: 'Read the assigned simulated weather profile',
        parameters: [
          { name: 'lat', in: 'query', required: true, schema: { type: 'number', minimum: -90, maximum: 90 } },
          { name: 'lng', in: 'query', required: true, schema: { type: 'number', minimum: -180, maximum: 180 } },
          { name: 'droneId', in: 'query', required: true, schema: { type: 'integer', minimum: 1 } },
        ],
        responses: { '200': { description: 'Current DEMO weather' }, '409': { $ref: '#/components/responses/Conflict' } },
      },
    },
    '/missions/{id}/weather-check': {
      post: {
        tags: ['Weather'], summary: 'Create fresh START/MID/DEST weather snapshots',
        parameters: [{ $ref: '#/components/parameters/Id' }],
        responses: { '200': { description: 'Route weather decision' }, '409': { $ref: '#/components/responses/Conflict' } },
      },
    },
    '/alerts': {
      get: {
        tags: ['Alerts'], summary: 'List and filter alerts',
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['ACTIVE', 'RESOLVED'] } },
          { name: 'severity', in: 'query', schema: { type: 'string', enum: ['WARNING', 'CRITICAL'] } },
          { name: 'source', in: 'query', schema: { type: 'string', enum: ['ROUTE', 'WEATHER', 'TELEMETRY', 'SYSTEM'] } },
          { name: 'flightId', in: 'query', schema: { type: 'integer', minimum: 1 } },
          { name: 'missionId', in: 'query', schema: { type: 'integer', minimum: 1 } },
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
          { name: 'pageSize', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 25 } },
        ],
        responses: { '200': { description: 'Paginated alerts' } },
      },
    },
    '/alerts/{id}/resolve': {
      patch: {
        tags: ['Alerts'], summary: 'Resolve an active alert', parameters: [{ $ref: '#/components/parameters/Id' }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ResolveAlert' } } } },
        responses: { '200': { description: 'Resolved alert' }, '409': { $ref: '#/components/responses/Conflict' } },
      },
    },
    '/flights/{id}/simulation/start': {
      post: { tags: ['Simulation'], summary: 'Start a READY flight simulation', parameters: [{ $ref: '#/components/parameters/Id' }], responses: { '202': { description: 'Simulation started' }, '409': { $ref: '#/components/responses/Conflict' } } },
    },
    '/flights/{id}/simulation/stop': {
      post: { tags: ['Simulation'], summary: 'Stop an active flight simulation', parameters: [{ $ref: '#/components/parameters/Id' }], responses: { '200': { description: 'Simulation stopped' }, '409': { $ref: '#/components/responses/Conflict' } } },
    },
    '/flights/{id}/simulation/status': {
      get: { tags: ['Simulation'], summary: 'Get flight and latest telemetry state', parameters: [{ $ref: '#/components/parameters/Id' }], responses: { '200': { description: 'Simulation state' }, '404': { $ref: '#/components/responses/NotFound' } } },
    },
  },
  components: {
    parameters: {
      Id: { name: 'id', in: 'path', required: true, schema: { type: 'integer', minimum: 1 } },
      MissionId: { name: 'missionId', in: 'path', required: true, schema: { type: 'integer', minimum: 1 } },
    },
    schemas: {
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
          status: { type: 'string', enum: ['DRAFT', 'READY', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED'] },
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
        required: ['id', 'missionCode', 'name', 'drone', 'status', 'validationStatus', 'progressPercent', 'estimatedDistanceM', 'createdAt'],
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
          status: { type: 'string', enum: ['DRAFT', 'READY', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED'] },
          validationStatus: { type: 'string', enum: ['NOT_CHECKED', 'VALID', 'INVALID'] },
          progressPercent: { type: 'integer', minimum: 0, maximum: 100 },
          estimatedDistanceM: { type: 'number', minimum: 0 },
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
      DroneListItem: {
        type: 'object', required: ['id', 'droneCode', 'displayName', 'status', 'isSimulated', 'model', 'homeLocation', 'lastKnownLocation'],
        properties: {
          id: { type: 'integer', format: 'int64' },
          droneCode: { type: 'string' },
          displayName: { type: 'string' },
          status: { type: 'string', enum: ['AVAILABLE', 'IN_FLIGHT', 'MAINTENANCE', 'OFFLINE'] },
          isSimulated: { type: 'boolean' },
          model: {
            type: 'object', required: ['modelCode', 'manufacturer', 'modelName'],
            properties: { modelCode: { type: 'string' }, manufacturer: { type: 'string' }, modelName: { type: 'string' } },
          },
          homeLocation: { $ref: '#/components/schemas/HomeLocation' },
          lastKnownLocation: { $ref: '#/components/schemas/LastKnownLocation' },
        },
      },
      DroneListResponse: {
        type: 'object', required: ['data', 'page', 'pageSize', 'total'],
        properties: {
          data: { type: 'array', items: { $ref: '#/components/schemas/DroneListItem' } },
          page: { type: 'integer' }, pageSize: { type: 'integer' }, total: { type: 'integer' },
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
