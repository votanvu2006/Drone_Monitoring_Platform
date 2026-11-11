import express from 'express';
import type { Pool } from 'mysql2/promise';
import swaggerUi from 'swagger-ui-express';
import { errorHandler } from './middleware/error-handler';
import { createAlertsRouter } from './modules/alerts';
import { createFleetRouter } from './modules/fleet';
import { createFlightOperationsRouter } from './modules/flight-operations';
import { createMissionsRouter } from './modules/missions';
import { openApiDocument } from './openapi';
import { healthRouter } from './routes/health';

export function createApp(database?: Pool): express.Express {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json());
  // Cho frontend biết đây có phải lần chạy demo mới hay không.
  app.get('/api/demo-run', (_request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    response.json({
      data: {
        runId: process.env.DEMO_RUN_ID ?? null,
      },
    });
  });

  app.use('/api/health', healthRouter);
  app.get('/api/openapi.json', (_request, response) =>
    response.json(openApiDocument),
  );
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));

  if (database) {
    app.use('/api', createFleetRouter(database));
    app.use('/api', createFlightOperationsRouter(database));
    app.use('/api', createMissionsRouter(database));
    app.use('/api/alerts', createAlertsRouter(database));
  }

  app.use((_request, response) => {
    response.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Route not found' },
    });
  });

  app.use(errorHandler);
  return app;
}