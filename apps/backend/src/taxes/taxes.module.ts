import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaxesService } from './taxes.service';
import { TaxesController } from './taxes.controller';
import { Tax } from './entities/tax.entity';
import { Company } from '../companies/entities/company.entity';
import { CompaniesModule } from '../companies/companies.module';
import { ModuleEnabledGuard } from '../common/guards/module-enabled.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Tax, Company]), CompaniesModule],
  controllers: [TaxesController],
  providers: [TaxesService, ModuleEnabledGuard],
})
export class TaxesModule {}
