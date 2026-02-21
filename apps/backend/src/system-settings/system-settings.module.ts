import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SystemSetting } from './entities/system-setting.entity';
import { SystemSettingsService } from './system-settings.service';
import { SystemSettingsController } from './system-settings.controller';
import { CompaniesModule } from '../companies/companies.module';
import { ModuleEnabledGuard } from '../common/guards/module-enabled.guard';

@Module({
  imports: [TypeOrmModule.forFeature([SystemSetting]), CompaniesModule],
  controllers: [SystemSettingsController],
  providers: [SystemSettingsService, ModuleEnabledGuard],
  exports: [SystemSettingsService],
})
export class SystemSettingsModule {}
