import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EstablishmentsService } from './establishments.service';
import { EstablishmentsController } from './establishments.controller';
import { Establishment } from './entities/establishment.entity';
import { Company } from '../companies/entities/company.entity';
@Module({
  imports: [TypeOrmModule.forFeature([Establishment, Company])],
  controllers: [EstablishmentsController],
  providers: [EstablishmentsService],
})
export class EstablishmentsModule {}