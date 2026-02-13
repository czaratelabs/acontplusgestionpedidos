import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Warehouse } from './entities/warehouse.entity';
import { Establishment } from '../establishments/entities/establishment.entity';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';

@Injectable()
export class WarehousesService {
  constructor(
    @InjectRepository(Warehouse)
    private warehouseRepo: Repository<Warehouse>,
    @InjectRepository(Establishment)
    private establishmentRepo: Repository<Establishment>,
  ) {}

  async create(establishmentId: string, dto: CreateWarehouseDto): Promise<Warehouse> {
    const establishment = await this.establishmentRepo.findOneBy({ id: establishmentId });
    if (!establishment) throw new NotFoundException('Establecimiento no encontrado');

    const warehouse = this.warehouseRepo.create({
      ...dto,
      establishment,
    });
    return this.warehouseRepo.save(warehouse);
  }

  async findAllByEstablishment(establishmentId: string): Promise<Warehouse[]> {
    return this.warehouseRepo.find({
      where: { establishment: { id: establishmentId } },
      order: { name: 'ASC' },
    });
  }

  async update(id: string, dto: UpdateWarehouseDto): Promise<Warehouse> {
    const warehouse = await this.warehouseRepo.findOneBy({ id });
    if (!warehouse) throw new NotFoundException('Almacén no encontrado');
    Object.assign(warehouse, dto);
    return this.warehouseRepo.save(warehouse);
  }
}
