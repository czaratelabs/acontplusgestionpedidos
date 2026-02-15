import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { SystemSettingsService } from './system-settings.service';
import { SystemSetting } from './entities/system-setting.entity';
import { UpdateSettingDto } from './dto/update-setting.dto';

@Controller('system-settings')
@UseGuards(JwtAuthGuard)
export class SystemSettingsController {
  constructor(private readonly service: SystemSettingsService) {}

  @Get()
  findAllByCompany(@Query('companyId') companyId: string): Promise<SystemSetting[]> {
    if (!companyId?.trim()) {
      throw new BadRequestException('companyId es obligatorio');
    }
    return this.service.findAllByCompany(companyId);
  }

  @Get(':key')
  findOne(
    @Param('key') key: string,
    @Query('companyId') companyId: string,
  ): Promise<SystemSetting> {
    if (!companyId?.trim()) {
      throw new BadRequestException('companyId es obligatorio');
    }
    return this.service.findOne(companyId, key);
  }

  @Patch(':key')
  @UseGuards(AdminGuard)
  update(
    @Param('key') key: string,
    @Body() body: UpdateSettingDto,
  ): Promise<SystemSetting> {
    return this.service.update(body.companyId, key, body.value, body.description);
  }
}
