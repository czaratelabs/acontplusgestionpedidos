import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as Joi from 'joi';
import { getDatabaseConfig, isSupabaseHost } from './data-source';
import { ClsModule } from './common/cls/cls.module';
import { AuthClsMiddleware } from './common/auth-cls.middleware';
import { AuditSubscriber } from './audit-logs/audit.subscriber';
import { TimestampSubscriber } from './common/timestamp.subscriber';
import { AuthModule } from './auth/auth.module';
import { EstablishmentsModule } from './establishments/establishments.module';
import { EmissionPointsModule } from './emission-points/emission-points.module';
import { WarehousesModule } from './warehouses/warehouses.module';
import { TaxesModule } from './taxes/taxes.module';
import { ContactsModule } from './contacts/contacts.module';
import { SystemSettingsModule } from './system-settings/system-settings.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { BusinessRulesModule } from './business-rules/business-rules.module';
import { ArticlesModule } from './articles/articles.module';
import { RoleGuard } from './common/guards/role.guard';

/**
 * Validación de entorno: evita arranque con DATABASE_URL ausente o mal formada
 * (ENOTFOUND / Tenant not found cuando Supabase pausa o la URI es incorrecta).
 */
const envValidationSchema = Joi.object({
  USE_LOCAL_DB: Joi.string().valid('true', '1', 'false', '0', '').optional(),
  DATABASE_URL: Joi.string().allow('').optional(),
  DATABASE_POOLER_URL: Joi.string().allow('').optional(),
  DB_HOST: Joi.string().optional(),
}).custom((obj, helpers) => {
  const local = obj.USE_LOCAL_DB === 'true' || obj.USE_LOCAL_DB === '1';
  if (local) return obj;
  const url = (obj.DATABASE_POOLER_URL || obj.DATABASE_URL || '').trim();
  if (url) {
    if (!/^postgres(ql):\/\//i.test(url)) {
      return helpers.message({
        custom: 'DATABASE_URL (o DATABASE_POOLER_URL) debe ser una URI postgres válida (postgres:// o postgresql://)',
      });
    }
    return obj;
  }
  if (obj.DB_HOST && String(obj.DB_HOST).trim()) return obj;
  return helpers.message({
    custom:
      'DATABASE_URL o DATABASE_POOLER_URL es obligatorio cuando USE_LOCAL_DB no está activo (o defina DB_HOST para conexión por host/puerto).',
  });
});

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
      validationOptions: { abortEarly: false },
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    ClsModule,
    // IMPORTANT: For Supabase, ensure your DATABASE_URL uses the Connection Pooler port
    // (6543) instead of 5432 to prevent connection exhaustion.
    TypeOrmModule.forRoot({
      type: 'postgres',
      ...getDatabaseConfig(),
      ssl: (() => {
        const cfg = getDatabaseConfig();
        if (process.env.DB_SSL === 'true' || process.env.DB_SSL === '1')
          return { rejectUnauthorized: false };
        if (isSupabaseHost(cfg.host, cfg.url)) return { rejectUnauthorized: false };
        return false;
      })(),
      autoLoadEntities: true,
      synchronize: false,
      subscribers: [TimestampSubscriber],
      // Resiliencia ante cortes o pausa de Supabase (reintentos de conexión)
      retryAttempts: 5,
      retryDelay: 3000,
    } as Parameters<typeof TypeOrmModule.forRoot>[0]),
    AuthModule, // Incluye Users, Companies, Roles
    EstablishmentsModule, // Company#establishments
    EmissionPointsModule, // Establishment#emissionPoints
    WarehousesModule, // Establishment#warehouses
    TaxesModule, // Company#taxes
    ContactsModule, // Company#contacts
    SystemSettingsModule, // Company#settings
    AuditLogsModule, // GET /audit-logs
    BusinessRulesModule,
    ArticlesModule, // Parent-Variant articles (logistics)
  ],
  providers: [AuditSubscriber, { provide: APP_GUARD, useClass: ThrottlerGuard }, RoleGuard],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthClsMiddleware).forRoutes('*');
  }
}
