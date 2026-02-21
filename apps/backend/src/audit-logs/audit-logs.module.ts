import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLogsService } from './audit-logs.service';
import { AuditLogsController } from './audit-logs.controller';
import { AuditLog } from './entities/audit-log.entity';
import { CompaniesModule } from '../companies/companies.module';
import { ModuleEnabledGuard } from '../common/guards/module-enabled.guard';

@Module({
  imports: [TypeOrmModule.forFeature([AuditLog]), CompaniesModule],
  controllers: [AuditLogsController],
  providers: [AuditLogsService, ModuleEnabledGuard],
  exports: [AuditLogsService],
})
export class AuditLogsModule {}
