import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tax } from './entities/tax.entity';
import { Company } from '../companies/entities/company.entity';
import { CreateTaxDto } from './dto/create-tax.dto';
import { UpdateTaxDto } from './dto/update-tax.dto';

@Injectable()
export class TaxesService {
  constructor(
    @InjectRepository(Tax)
    private taxRepo: Repository<Tax>,
    @InjectRepository(Company)
    private companyRepo: Repository<Company>,
  ) {}

  async create(companyId: string, dto: CreateTaxDto): Promise<Tax> {
    const company = await this.companyRepo.findOneBy({ id: companyId });
    if (!company) throw new NotFoundException('Empresa no encontrada');

    const tax = this.taxRepo.create({
      ...dto,
      company,
    });
    return this.taxRepo.save(tax);
  }

  async findAllByCompany(companyId: string): Promise<Tax[]> {
    return this.taxRepo.find({
      where: { company: { id: companyId } },
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Tax> {
    const tax = await this.taxRepo.findOne({ where: { id }, relations: ['company'] });
    if (!tax) throw new NotFoundException('Impuesto no encontrado');
    return tax;
  }

  async update(id: string, dto: UpdateTaxDto): Promise<Tax> {
    const tax = await this.taxRepo.findOne({ where: { id }, relations: ['company'] });
    if (!tax) throw new NotFoundException('Impuesto no encontrado');
    Object.assign(tax, dto);
    return this.taxRepo.save(tax);
  }

  async remove(id: string): Promise<Tax> {
    const tax = await this.taxRepo.findOne({ where: { id }, relations: ['company'] });
    if (!tax) throw new NotFoundException('Impuesto no encontrado');
    tax.is_active = false;
    return this.taxRepo.save(tax);
  }

  async activate(id: string): Promise<Tax> {
    const tax = await this.taxRepo.findOne({ where: { id }, relations: ['company'] });
    if (!tax) throw new NotFoundException('Impuesto no encontrado');
    tax.is_active = true;
    return this.taxRepo.save(tax);
  }
}
