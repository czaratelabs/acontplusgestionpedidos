import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompaniesService } from './companies.service';
import { CompaniesController } from './companies.controller';
import { SubscriptionPlansController } from './subscription-plans.controller';
import { Company } from './entities/company.entity';
import { SubscriptionPlan } from './entities/subscription-plan.entity';
import { UserCompany } from '../users/entities/user-company.entity';
import { Establishment } from '../establishments/entities/establishment.entity';
import { Warehouse } from '../warehouses/entities/warehouse.entity';
import { EmissionPoint } from '../emission-points/entities/emission-point.entity';
import { Contact } from '../contacts/entities/contact.entity';
import { ModuleEnabledGuard } from '../common/guards/module-enabled.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Company,
      SubscriptionPlan,
      UserCompany,
      Establishment,
      Warehouse,
      EmissionPoint,
      Contact,
    ]),
  ],
  controllers: [CompaniesController, SubscriptionPlansController],
  providers: [CompaniesService, ModuleEnabledGuard],
  exports: [CompaniesService],
})
export class CompaniesModule {}
