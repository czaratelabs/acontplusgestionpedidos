import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm'; // 👈 Importante
import { EstablishmentsService } from './establishments.service';
import { EstablishmentsController } from './establishments.controller';
import { Establishment } from './entities/establishment.entity';
import { Company } from '../companies/entities/company.entity'; // 👈 Necesitamos esto también

@Module({
  imports: [
    // 👇 ESTA ES LA MAGIA QUE FALTABA:
    // Le damos permiso al módulo para usar estas dos tablas
    TypeOrmModule.forFeature([Establishment, Company]),
  ],
  controllers: [EstablishmentsController],
  providers: [EstablishmentsService],
})
export class EstablishmentsModule {}