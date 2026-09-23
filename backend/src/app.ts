import express from 'express';
import { errorHandler } from './middleware/error-handler';
import { healthRouter } from './routes/health';

export function createApp(): express.Express {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json());

  app.use('/api/health', healthRouter);

  app.use((_request, response) => {
    response.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } });
  });

  app.use(errorHandler);
  return app;
}
