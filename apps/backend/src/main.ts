// Force Node.js process timezone to Ecuador so that new Date() is in local (Ecuador) time
process.env.TZ = 'America/Guayaquil';

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { DataSource } from 'typeorm';
import { AppModule } from './app.module';
import { setClsServiceForAudit } from './common/audit-context';
import { HttpExceptionFilter } from './common/http-exception.filter';
import { AuditSubscriber } from './audit-logs/audit.subscriber';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const cls = app.get(ClsService);
  setClsServiceForAudit(cls);

  // Register AuditSubscriber manually to ensure it's properly initialized
  const dataSource = app.get(DataSource);
  const auditSubscriber = app.get(AuditSubscriber);
  if (!dataSource.subscribers.includes(auditSubscriber)) {
    dataSource.subscribers.push(auditSubscriber);
    console.log('[Audit] AuditSubscriber registered manually');
  } else {
    console.log('[Audit] AuditSubscriber already registered');
  }

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
  console.log(`Backend API: http://localhost:${port}`);
}
bootstrap();
