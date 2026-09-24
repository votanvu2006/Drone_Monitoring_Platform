import express from 'express';
import type { Pool } from 'mysql2/promise';
import { errorHandler } from './middleware/error-handler';
import { createAirspaceRouter } from './modules/airspace';
import { createAlertsRouter } from './modules/alerts';
import { healthRouter } from './routes/health';

export function createApp(database?: Pool): express.Express {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json());

  app.use('/api/health', healthRouter);
  if (database) {
    app.use('/api', createAirspaceRouter(database));
    app.use('/api/alerts', createAlertsRouter(database));
  }

  app.use((_request, response) => {
    response.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } });
  });

  app.use(errorHandler);
  return app;
}
