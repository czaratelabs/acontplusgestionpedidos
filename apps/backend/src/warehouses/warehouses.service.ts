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
    const establishment = await this.establishmentRepo.findOne({
      where: { id: establishmentId },
      relations: ['company'],
    });
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
    // Load with establishment relation (and nested company) so company_id is preserved in audit logs
    const warehouse = await this.warehouseRepo.findOne({
      where: { id },
      relations: ['establishment', 'establishment.company'],
    });
    if (!warehouse) throw new NotFoundException('Almacén no encontrado');
    // Actualizar solo campos del DTO para no tocar la relación establishment
    if (dto.name !== undefined) warehouse.name = dto.name;
    if (dto.description !== undefined) warehouse.description = dto.description ?? null;
    return this.warehouseRepo.save(warehouse);
  }

  async remove(id: string): Promise<Warehouse> {
    const warehouse = await this.warehouseRepo.findOne({
      where: { id },
      relations: ['establishment', 'establishment.company'],
    });
    if (!warehouse) throw new NotFoundException('Almacén no encontrado');
    warehouse.isActive = false;
    return this.warehouseRepo.save(warehouse);
  }

  async activate(id: string): Promise<Warehouse> {
    const warehouse = await this.warehouseRepo.findOne({
      where: { id },
      relations: ['establishment', 'establishment.company'],
    });
    if (!warehouse) throw new NotFoundException('Almacén no encontrado');
    warehouse.isActive = true;
    return this.warehouseRepo.save(warehouse);
  }
}
