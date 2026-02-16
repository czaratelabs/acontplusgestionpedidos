import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { BusinessRulesService } from './business-rules.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';

@Controller('business-rules')
@UseGuards(JwtAuthGuard)
export class BusinessRulesController {
  constructor(private readonly service: BusinessRulesService) {}

  @Get()
  findAll(@Query('companyId') companyId: string) {
    if (!companyId?.trim()) {
      throw new BadRequestException('companyId es requerido');
    }
    return this.service.getAllForCompany(companyId);
  }

  @Get('check')
  async checkRule(
    @Query('companyId') companyId: string,
    @Query('ruleKey') ruleKey: string,
  ) {
    if (!companyId?.trim() || !ruleKey?.trim()) {
      throw new BadRequestException('companyId y ruleKey son requeridos');
    }
    const isEnabled = await this.service.checkRule(companyId, ruleKey);
    return { ruleKey, isEnabled };
  }

  @Patch(':companyId/:ruleKey')
  @UseGuards(AdminGuard)
  async setRule(
    @Param('companyId') companyId: string,
    @Param('ruleKey') ruleKey: string,
    @Body() body: { isEnabled: boolean; metadata?: Record<string, unknown> },
  ) {
    return this.service.setRule(
      companyId,
      ruleKey,
      body.isEnabled ?? false,
      body.metadata,
    );
  }
}
