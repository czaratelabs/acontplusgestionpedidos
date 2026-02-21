import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EstablishmentsService } from './establishments.service';
import { EstablishmentsController } from './establishments.controller';
import { Establishment } from './entities/establishment.entity';
import { Company } from '../companies/entities/company.entity';
import { CompaniesModule } from '../companies/companies.module';
import { ModuleEnabledGuard } from '../common/guards/module-enabled.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Establishment, Company]), CompaniesModule],
  controllers: [EstablishmentsController],
  providers: [EstablishmentsService, ModuleEnabledGuard],
})
export class EstablishmentsModule {}