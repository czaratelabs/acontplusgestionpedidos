// Force Node.js process timezone to Ecuador so that new Date() is in local (Ecuador) time
process.env.TZ = 'America/Guayaquil';

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ClsService } from './common/cls/cls-context.service';
import { DataSource } from 'typeorm';
import { AppModule } from './app.module';
import { setClsServiceForAudit } from './common/audit-context';
import { HttpExceptionFilter } from './common/http-exception.filter';
import { AuditSubscriber } from './common/audit/audit.subscriber';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const cls = app.get(ClsService);
  setClsServiceForAudit(cls);

  // Register AuditSubscriber manually to ensure it's properly initialized
  // TypeORM requires explicit registration for subscribers to work
  const dataSource = app.get(DataSource);
  const auditSubscriber = app.get(AuditSubscriber);
  
  // Remove any existing instance to avoid duplicates
  const existingIndex = dataSource.subscribers.findIndex(
    (sub) => sub.constructor.name === 'AuditSubscriber'
  );
  if (existingIndex >= 0) {
    dataSource.subscribers.splice(existingIndex, 1);
  }
  
  // Add the NestJS-managed instance
  dataSource.subscribers.push(auditSubscriber);
  logger.log('AuditSubscriber registered successfully');
  logger.debug(
    `Total subscribers: ${dataSource.subscribers.length} - ` +
    `Names: [${dataSource.subscribers.map(s => s.constructor.name).join(', ')}]`
  );

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.use(cookieParser());

  // CORS: frontend Next.js suele ir en 3000, backend en 3001
  app.enableCors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
  });

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  logger.log(`Backend API: http://localhost:${port}`);
}
bootstrap();
