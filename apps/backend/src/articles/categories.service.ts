import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './entities/category.entity';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly repo: Repository<Category>,
  ) {}

  async findByCompany(companyId: string): Promise<Category[]> {
    return this.repo.find({
      where: { companyId },
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Category> {
    const c = await this.repo.findOne({ where: { id } });
    if (!c) throw new NotFoundException('Categoría no encontrada');
    return c;
  }

  async create(companyId: string, name: string): Promise<Category> {
    const c = this.repo.create({ name: name.trim(), companyId });
    return this.repo.save(c);
  }

  async update(id: string, companyId: string, name: string): Promise<Category> {
    const c = await this.repo.findOne({ where: { id, companyId } });
    if (!c) throw new NotFoundException('Categoría no encontrada');
    c.name = name.trim();
    return this.repo.save(c);
  }

  async remove(id: string, companyId: string): Promise<void> {
    const c = await this.repo.findOne({ where: { id, companyId } });
    if (!c) throw new NotFoundException('Categoría no encontrada');
    await this.repo.remove(c);
  }
}
