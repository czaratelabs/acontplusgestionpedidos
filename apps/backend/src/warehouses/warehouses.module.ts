import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WarehousesService } from './warehouses.service';
import { WarehousesController } from './warehouses.controller';
import { Warehouse } from './entities/warehouse.entity';
import { Establishment } from '../establishments/entities/establishment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Warehouse, Establishment]),
  ],
  controllers: [WarehousesController],
  providers: [WarehousesService],
})
export class WarehousesModule {}
