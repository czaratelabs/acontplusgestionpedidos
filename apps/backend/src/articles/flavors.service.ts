import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Flavor } from './entities/flavor.entity';

@Injectable()
export class FlavorsService {
  constructor(
    @InjectRepository(Flavor)
    private readonly repo: Repository<Flavor>,
  ) {}

  async findByCompany(companyId: string): Promise<Flavor[]> {
    return this.repo.find({
      where: { companyId },
      order: { name: 'ASC' },
    });
  }

  async create(companyId: string, name: string): Promise<Flavor> {
    const f = this.repo.create({ name: name.trim(), companyId });
    return this.repo.save(f);
  }

  async update(id: string, companyId: string, name: string): Promise<Flavor> {
    const f = await this.repo.findOne({ where: { id, companyId } });
    if (!f) throw new NotFoundException('Sabor no encontrado');
    f.name = name.trim();
    return this.repo.save(f);
  }

  async remove(id: string, companyId: string): Promise<void> {
    const f = await this.repo.findOne({ where: { id, companyId } });
    if (!f) throw new NotFoundException('Sabor no encontrado');
    await this.repo.remove(f);
  }
}
