export const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'Drone Monitoring Platform API',
    version: '0.2.0',
    description: 'Backend APIs for airspace, demo weather, flight simulation and alert lifecycle management.',
  },
  servers: [{ url: '/api' }],
  tags: [
    { name: 'Airspace' }, { name: 'Weather' }, { name: 'Simulation' }, { name: 'Alerts' },
  ],
  paths: {
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
    },
    schemas: {
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
