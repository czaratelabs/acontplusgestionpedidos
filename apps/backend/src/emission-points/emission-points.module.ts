import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmissionPointsService } from './emission-points.service';
import { EmissionPointsController } from './emission-points.controller';
import { EmissionPoint } from './entities/emission-point.entity';
import { Establishment } from '../establishments/entities/establishment.entity';
import { CompaniesModule } from '../companies/companies.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([EmissionPoint, Establishment]),
    CompaniesModule,
  ],
  controllers: [EmissionPointsController],
  providers: [EmissionPointsService],
})
export class EmissionPointsModule {}