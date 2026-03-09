import { INestApplication, ValidationPipe } from '@nestjs/common';
import { App } from 'supertest/types';

/**
 * Configura la app para e2e igual que main.ts (ValidationPipe, CORS, etc.)
 */
export async function bootstrapE2eApp(app: INestApplication<App>): Promise<INestApplication> {
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.enableCors({ origin: true, credentials: true });
  return app;
}
