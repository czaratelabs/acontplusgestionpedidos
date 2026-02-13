import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm'; // 👈 Importar
import { EmissionPointsService } from './emission-points.service';
import { EmissionPointsController } from './emission-points.controller';
import { EmissionPoint } from './entities/emission-point.entity';
import { Establishment } from '../establishments/entities/establishment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([EmissionPoint, Establishment]), // 👈 Registramos ambas
  ],
  controllers: [EmissionPointsController],
  providers: [EmissionPointsService],
})
export class EmissionPointsModule {}