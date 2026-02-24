import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Measure } from './entities/measure.entity';

@Injectable()
export class MeasuresService {
  constructor(
    @InjectRepository(Measure)
    private readonly repo: Repository<Measure>,
  ) {}

  async findByCompany(companyId: string): Promise<Measure[]> {
    return this.repo.find({
      where: { companyId },
      order: { name: 'ASC' },
    });
  }

  async create(companyId: string, name: string): Promise<Measure> {
    const m = this.repo.create({ name: name.trim(), companyId });
    return this.repo.save(m);
  }

  async update(id: string, companyId: string, name: string): Promise<Measure> {
    const m = await this.repo.findOne({ where: { id, companyId } });
    if (!m) throw new NotFoundException('Medida no encontrada');
    m.name = name.trim();
    return this.repo.save(m);
  }

  async remove(id: string, companyId: string): Promise<void> {
    const m = await this.repo.findOne({ where: { id, companyId } });
    if (!m) throw new NotFoundException('Medida no encontrada');
    await this.repo.remove(m);
  }
}
