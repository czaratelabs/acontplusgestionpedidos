import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './entities/category.entity';

/** Genera siglas del nombre: 1 palabra → 3 letras; 2+ palabras → 2 letras primera + 1 por resto. Mayúsculas. */
export function computeSiglas(name: string): string {
  const trimmed = (name || '').trim();
  if (!trimmed) return '';
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length === 1) {
    return words[0].slice(0, 3).toUpperCase();
  }
  const parts = words.map((w, i) => (i === 0 ? w.slice(0, 2) : w.slice(0, 1)));
  return parts.join('').toUpperCase();
}

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

  async create(companyId: string, name: string, siglasOverride?: string): Promise<Category> {
    const trimmed = name.trim();
    const siglas = siglasOverride?.trim()
      ? siglasOverride.trim().toUpperCase()
      : computeSiglas(trimmed);
    const c = this.repo.create({
      name: trimmed,
      companyId,
      siglas,
      secuencial: 1,
      secuencialVariantes: 1,
    });
    return this.repo.save(c);
  }

  async update(id: string, companyId: string, name: string, siglas?: string, secuencial?: number): Promise<Category> {
    const c = await this.repo.findOne({ where: { id, companyId } });
    if (!c) throw new NotFoundException('Categoría no encontrada');
    c.name = name.trim();
    c.siglas = siglas?.trim() ? siglas.trim().toUpperCase() : computeSiglas(c.name);
    if (secuencial !== undefined && secuencial !== null && secuencial >= 1) {
      c.secuencial = Math.floor(secuencial);
    }
    return this.repo.save(c);
  }

  /** Incrementa secuencial de la categoría tras crear un artículo. */
  async incrementSecuencial(id: string, companyId: string): Promise<void> {
    const c = await this.repo.findOne({ where: { id, companyId } });
    if (!c) return;
    c.secuencial = (c.secuencial ?? 1) + 1;
    await this.repo.save(c);
  }

  async remove(id: string, companyId: string): Promise<void> {
    const c = await this.repo.findOne({ where: { id, companyId } });
    if (!c) throw new NotFoundException('Categoría no encontrada');
    await this.repo.remove(c);
  }
}
