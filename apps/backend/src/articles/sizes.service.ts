import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Size } from './entities/size.entity';

@Injectable()
export class SizesService {
  constructor(
    @InjectRepository(Size)
    private readonly repo: Repository<Size>,
  ) {}

  async findByCompany(companyId: string): Promise<Size[]> {
    return this.repo.find({
      where: { companyId },
      order: { name: 'ASC' },
    });
  }

  async create(companyId: string, name: string): Promise<Size> {
    const s = this.repo.create({ name: name.trim(), companyId });
    return this.repo.save(s);
  }

  async update(id: string, companyId: string, name: string): Promise<Size> {
    const s = await this.repo.findOne({ where: { id, companyId } });
    if (!s) throw new NotFoundException('Talla no encontrada');
    s.name = name.trim();
    return this.repo.save(s);
  }

  async remove(id: string, companyId: string): Promise<void> {
    const s = await this.repo.findOne({ where: { id, companyId } });
    if (!s) throw new NotFoundException('Talla no encontrada');
    await this.repo.remove(s);
  }
}
