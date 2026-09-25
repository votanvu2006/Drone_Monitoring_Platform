import express from 'express';
import type { Pool } from 'mysql2/promise';
import swaggerUi from 'swagger-ui-express';
import { errorHandler } from './middleware/error-handler';
import { createAirspaceRouter } from './modules/airspace';
import { createAlertsRouter } from './modules/alerts';
import { createFleetRouter } from './modules/fleet';
import { createFlightOperationsRouter } from './modules/flight-operations';
import { createMissionsRouter } from './modules/missions';
import { createWeatherRouter } from './modules/weather';
import { SimulationEngine } from './modules/simulation';
import { openApiDocument } from './openapi';
import { healthRouter } from './routes/health';

export function createApp(database?: Pool, simulationEngine?: SimulationEngine): express.Express {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json());

  app.use('/api/health', healthRouter);
  app.get('/api/openapi.json', (_request, response) => response.json(openApiDocument));
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));
  if (database) {
    app.use('/api', createAirspaceRouter(database));
    app.use('/api', createFleetRouter(database));
    app.use('/api', createFlightOperationsRouter(database));
    app.use('/api', createMissionsRouter(database));
    app.use('/api', createWeatherRouter(database));
    app.use('/api/alerts', createAlertsRouter(database));
    app.use('/api', (simulationEngine ?? new SimulationEngine(database)).router());
  }

  app.use((_request, response) => {
    response.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } });
  });

  app.use(errorHandler);
  return app;
}
