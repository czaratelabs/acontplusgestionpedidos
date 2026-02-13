import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaxesService } from './taxes.service';
import { TaxesController } from './taxes.controller';
import { Tax } from './entities/tax.entity';
import { Company } from '../companies/entities/company.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Tax, Company])],
  controllers: [TaxesController],
  providers: [TaxesService],
})
export class TaxesModule {}
