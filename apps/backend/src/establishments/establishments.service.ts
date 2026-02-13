import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Establishment } from './entities/establishment.entity';
import { Company } from '../companies/entities/company.entity';
import { CreateEstablishmentDto } from './dto/create-establishment.dto';
import { UpdateEstablishmentDto } from './dto/update-establishment.dto';

@Injectable()
export class EstablishmentsService {
  constructor(
    @InjectRepository(Establishment)
    private establishmentRepo: Repository<Establishment>,
    @InjectRepository(Company)
    private companyRepo: Repository<Company>,
  ) {}

  async create(companyId: string, dto: CreateEstablishmentDto) {
    const company = await this.companyRepo.findOneBy({ id: companyId });
    if (!company) throw new NotFoundException('Empresa no encontrada');

    const newEstablishment = this.establishmentRepo.create({
      ...dto,
      company,
    });
    return this.establishmentRepo.save(newEstablishment);
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
}