import 'dotenv/config';
import { createApp } from './app';
import { createDatabase } from './config/database';
import { readConfig } from './config/env';

async function main(): Promise<void> {
  const config = readConfig(process.env);
  const database = createDatabase(config.database);

  try {
    await database.query('SELECT 1');
  } catch {
    throw new Error('Could not connect to MySQL. Check database settings and that MySQL is running.');
  }

  const server = createApp(database).listen(config.port, () => {
    console.info(`API listening on port ${config.port}`);
  });

  function shutdown(): void {
    server.close(() => {
      void database.end();
    });
  }

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Failed to start API');
  process.exitCode = 1;
});
