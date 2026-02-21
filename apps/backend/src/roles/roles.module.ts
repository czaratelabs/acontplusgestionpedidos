import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from './entities/role.entity';
import { RolesService } from './roles.service';
import { RolesController } from './roles.controller';
import { CompaniesModule } from '../companies/companies.module';
import { ModuleEnabledGuard } from '../common/guards/module-enabled.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Role]), CompaniesModule],
  controllers: [RolesController],
  providers: [RolesService, ModuleEnabledGuard],
  exports: [TypeOrmModule, RolesService],
})
export class RolesModule {}
