import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UserCompany } from './entities/user-company.entity';
import { Company } from '../companies/entities/company.entity';
import { RolesModule } from '../roles/roles.module';
import { CompaniesModule } from '../companies/companies.module';
import { ModuleEnabledGuard } from '../common/guards/module-enabled.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserCompany, Company]),
    RolesModule,
    CompaniesModule,
  ],
  controllers: [UsersController],
  providers: [UsersService, ModuleEnabledGuard],
  exports: [UsersService],
})
export class UsersModule {}