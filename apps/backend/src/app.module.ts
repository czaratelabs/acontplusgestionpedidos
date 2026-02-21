import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
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

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ClsModule,
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: 5432,
      username: process.env.DB_USERNAME || 'admin',
      password: process.env.DB_PASSWORD || 'adminpassword',
      database: process.env.DB_DATABASE || 'erp_db',
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