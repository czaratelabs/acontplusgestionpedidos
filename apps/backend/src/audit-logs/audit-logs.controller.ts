import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuditLogsService } from './audit-logs.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ModuleEnabledGuard } from '../common/guards/module-enabled.guard';
import { ModuleEnabled } from '../common/decorators/module-enabled.decorator';

@Controller('audit-logs')
@UseGuards(JwtAuthGuard, ModuleEnabledGuard)
@ModuleEnabled('admin_audit')
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  async findAll(
    @Query('companyId') companyId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    try {
      const pageNum = Math.max(1, parseInt(page || '1', 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit || '20', 10) || 20));
      return await this.auditLogsService.findAll(companyId, pageNum, limitNum);
    } catch (err) {
      console.error('🕵️ Audit Logs findAll error:', err);
      throw err;
    }
  }

  @Get('company/:companyId')
  async findAllByCompany(
    @Param('companyId') companyId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    try {
      const pageNum = Math.max(1, parseInt(page || '1', 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit || '20', 10) || 20));
      return await this.auditLogsService.findAllByCompany(companyId, pageNum, limitNum);
    } catch (err) {
      console.error('🕵️ Audit Logs findAllByCompany error:', err);
      throw err;
    }
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.auditLogsService.findOne(id);
  }
}
