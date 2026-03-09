// Force Node.js process timezone to Ecuador so that new Date() is in local (Ecuador) time
process.env.TZ = 'America/Guayaquil';

import { NestFactory } from '@nestjs/core';
import { join } from 'path';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ClsService } from './common/cls/cls-context.service';
import { DataSource } from 'typeorm';
import { AppModule } from './app.module';
import { setClsServiceForAudit } from './common/audit-context';
import { HttpExceptionFilter } from './common/http-exception.filter';
import { AuditSubscriber } from './audit-logs/audit.subscriber';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const cls = app.get(ClsService);
  setClsServiceForAudit(cls);

  // Register AuditSubscriber manually to ensure it's properly initialized
  // TypeORM requires explicit registration for subscribers to work
  const dataSource = app.get(DataSource);
  const auditSubscriber = app.get(AuditSubscriber);
  // subscribers is read-only in TypeORM typings; cast to allow replacing the array
  const mutableDs = dataSource as DataSource & { subscribers: typeof dataSource.subscribers };
  mutableDs.subscribers = mutableDs.subscribers.filter(
    (sub) => sub.constructor.name !== 'AuditSubscriber'
  );
  mutableDs.subscribers.push(auditSubscriber);
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
  app.use(helmet());
  app.use(cookieParser());

  // Static files for uploads (article images)
  const express = await import('express');
  app.use('/uploads', express.static(join(process.cwd(), 'uploads')));

  // CORS configurable por entorno — separar múltiples orígenes con coma en CORS_ORIGIN
  const corsOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
    : ['http://localhost:3000', 'http://127.0.0.1:3000'];

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  const config = new DocumentBuilder()
    .setTitle('ACont+ API')
    .setDescription('API de gestión de pedidos e inventario para PyMEs')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  logger.log(`Backend API: http://localhost:${port}`);
  logger.log(`Swagger docs: http://localhost:${port}/api/docs`);
}
bootstrap();
