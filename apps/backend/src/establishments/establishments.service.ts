import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Establishment } from './entities/establishment.entity';
import { Company } from '../companies/entities/company.entity';
import { CompaniesService } from '../companies/companies.service';
import { CreateEstablishmentDto } from './dto/create-establishment.dto';
import { UpdateEstablishmentDto } from './dto/update-establishment.dto';

@Injectable()
export class EstablishmentsService {
  constructor(
    @InjectRepository(Establishment)
    private establishmentRepo: Repository<Establishment>,
    @InjectRepository(Company)
    private companyRepo: Repository<Company>,
    private companiesService: CompaniesService,
  ) {}

  async create(companyId: string, dto: CreateEstablishmentDto) {
    const company = await this.companyRepo.findOneBy({ id: companyId });
    if (!company) throw new NotFoundException('Empresa no encontrada');

    await this.companiesService.assertResourceLimit(companyId, 'max_establishments', 'establecimientos');

    const newEstablishment = this.establishmentRepo.create({
      ...dto,
      company,
    });
    return this.establishmentRepo.save(newEstablishment);
  }

  async getEstablishmentLimitInfo(companyId: string): Promise<{ count: number; limit: number }> {
    return this.companiesService.getEstablishmentLimitInfo(companyId);
  }

  async findAllByCompany(companyId: string) {
    return this.establishmentRepo.find({
      where: { company: { id: companyId } },
      order: { series: 'ASC' }
    });
  }

  async update(id: string, dto: UpdateEstablishmentDto): Promise<Establishment> {
    // Load with company relation to ensure company_id is preserved in audit logs
    const establishment = await this.establishmentRepo.findOne({
      where: { id },
      relations: ['company'],
    });
    if (!establishment) throw new NotFoundException('Establecimiento no encontrado');
    Object.assign(establishment, dto);
    return this.establishmentRepo.save(establishment);
  }

  async remove(id: string): Promise<Establishment> {
    const establishment = await this.establishmentRepo.findOne({
      where: { id },
      relations: ['company'],
    });
    if (!establishment) throw new NotFoundException('Establecimiento no encontrado');
    establishment.isActive = false;
    return this.establishmentRepo.save(establishment);
  }

  async activate(id: string): Promise<Establishment> {
    const establishment = await this.establishmentRepo.findOne({
      where: { id },
      relations: ['company'],
    });
    if (!establishment) throw new NotFoundException('Establecimiento no encontrado');
    establishment.isActive = true;
    return this.establishmentRepo.save(establishment);
  }
}