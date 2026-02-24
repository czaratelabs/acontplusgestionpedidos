import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Brand } from './entities/brand.entity';

@Injectable()
export class BrandsService {
  constructor(
    @InjectRepository(Brand)
    private readonly repo: Repository<Brand>,
  ) {}

  async findByCompany(companyId: string): Promise<Brand[]> {
    return this.repo.find({
      where: { companyId },
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Brand> {
    const b = await this.repo.findOne({ where: { id } });
    if (!b) throw new NotFoundException('Marca no encontrada');
    return b;
  }

  async create(companyId: string, name: string): Promise<Brand> {
    const b = this.repo.create({ name: name.trim(), companyId });
    return this.repo.save(b);
  }

  async update(id: string, companyId: string, name: string): Promise<Brand> {
    const b = await this.repo.findOne({ where: { id, companyId } });
    if (!b) throw new NotFoundException('Marca no encontrada');
    b.name = name.trim();
    return this.repo.save(b);
  }

  async remove(id: string, companyId: string): Promise<void> {
    const b = await this.repo.findOne({ where: { id, companyId } });
    if (!b) throw new NotFoundException('Marca no encontrada');
    await this.repo.remove(b);
  }
}
