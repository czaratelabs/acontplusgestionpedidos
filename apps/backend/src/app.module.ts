import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
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

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),
    ClsModule,
    TypeOrmModule.forRoot({
      type: 'postgres',
      ...getDatabaseConfig(),
      ssl: (() => {
        const cfg = getDatabaseConfig();
        if (process.env.DB_SSL === 'true' || process.env.DB_SSL === '1') return { rejectUnauthorized: false };
        if (isSupabaseHost(cfg.host, cfg.url)) return { rejectUnauthorized: false };
        return false;
      })(),
      autoLoadEntities: true,
      synchronize: false,
      subscribers: [TimestampSubscriber],
    }),
    AuthModule, // Incluye Users, Companies, Roles
    EstablishmentsModule, // Company#establishments
    EmissionPointsModule, // Establishment#emissionPoints
    WarehousesModule,     // Establishment#warehouses
    TaxesModule,          // Company#taxes
    ContactsModule,       // Company#contacts
    SystemSettingsModule, // Company#settings
    AuditLogsModule,   // GET /audit-logs
    BusinessRulesModule,
    ArticlesModule,    // Parent-Variant articles (logistics)
  ],
  providers: [
    AuditSubscriber,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AuthClsMiddleware)
      .forRoutes('*');
  }
}