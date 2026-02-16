import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLogsService } from './audit-logs.service';
import { AuditLogsController } from './audit-logs.controller';
import { AuditLog } from './entities/audit-log.entity';
import { AuditSubscriber } from './audit.subscriber';

@Module({
  imports: [TypeOrmModule.forFeature([AuditLog])],
  controllers: [AuditLogsController],
  providers: [AuditLogsService, AuditSubscriber],
  exports: [AuditLogsService],
})
export class AuditLogsModule {}
