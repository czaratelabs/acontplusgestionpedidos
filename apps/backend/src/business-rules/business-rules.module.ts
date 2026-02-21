import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BusinessRule } from './entities/business-rule.entity';
import { BusinessRulesService } from './business-rules.service';
import { BusinessRulesController } from './business-rules.controller';
import { CompaniesModule } from '../companies/companies.module';
import { ModuleEnabledGuard } from '../common/guards/module-enabled.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([BusinessRule]),
    CompaniesModule,
  ],
  controllers: [BusinessRulesController],
  providers: [BusinessRulesService, ModuleEnabledGuard],
  exports: [BusinessRulesService],
})
export class BusinessRulesModule {}
