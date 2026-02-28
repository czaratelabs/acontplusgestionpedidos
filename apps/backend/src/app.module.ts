import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getDatabaseConfig } from './data-source';
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
    ClsModule,
    TypeOrmModule.forRoot({
      type: 'postgres',
      ...getDatabaseConfig(),
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
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
  providers: [AuditSubscriber],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AuthClsMiddleware)
      .forRoutes('*');
  }
}