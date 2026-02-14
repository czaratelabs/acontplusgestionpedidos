import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClsModule } from 'nestjs-cls';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CompaniesModule } from './companies/companies.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { EstablishmentsModule } from './establishments/establishments.module';
import { EmissionPointsModule } from './emission-points/emission-points.module';
import { WarehousesModule } from './warehouses/warehouses.module';
import { TaxesModule } from './taxes/taxes.module';
import { ContactsModule } from './contacts/contacts.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { AuditSubscriber } from './audit-logs/audit.subscriber';
import { AuthClsMiddleware } from './common/auth-cls.middleware';

@Module({
  imports: [
    ConfigModule.forRoot(),
    ClsModule.forRoot({
      global: true,
      middleware: { mount: true },
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'admin',
      password: 'adminpassword',
      database: 'erp_db',
      extra: { options: '-c timezone=America/Guayaquil' },
      autoLoadEntities: true,
      synchronize: true,
      subscribers: [AuditSubscriber],
    }),
    CompaniesModule,
    UsersModule,
    AuthModule,
    EstablishmentsModule,
    EmissionPointsModule,
    WarehousesModule,
    TaxesModule,
    ContactsModule,
    AuditLogsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    AuthClsMiddleware,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthClsMiddleware).forRoutes('*');
  }
}
