import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Color } from './entities/color.entity';

@Injectable()
export class ColorsService {
  constructor(
    @InjectRepository(Color)
    private readonly repo: Repository<Color>,
  ) {}

  async findByCompany(companyId: string): Promise<Color[]> {
    return this.repo.find({
      where: { companyId },
      order: { name: 'ASC' },
    });
  }

  async create(companyId: string, name: string): Promise<Color> {
    const c = this.repo.create({ name: name.trim(), companyId });
    return this.repo.save(c);
  }

  async update(id: string, companyId: string, name: string): Promise<Color> {
    const c = await this.repo.findOne({ where: { id, companyId } });
    if (!c) throw new NotFoundException('Color no encontrado');
    c.name = name.trim();
    return this.repo.save(c);
  }

  async remove(id: string, companyId: string): Promise<void> {
    const c = await this.repo.findOne({ where: { id, companyId } });
    if (!c) throw new NotFoundException('Color no encontrado');
    await this.repo.remove(c);
  }
}
