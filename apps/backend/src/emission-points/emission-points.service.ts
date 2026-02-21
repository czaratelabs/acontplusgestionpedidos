import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmissionPoint } from './entities/emission-point.entity';
import { Establishment } from '../establishments/entities/establishment.entity';
import { CompaniesService } from '../companies/companies.service';
import { CreateEmissionPointDto } from './dto/create-emission-point.dto';
import { UpdateEmissionPointDto } from './dto/update-emission-point.dto';

@Injectable()
export class EmissionPointsService {
  constructor(
    @InjectRepository(EmissionPoint)
    private pointRepo: Repository<EmissionPoint>,
    @InjectRepository(Establishment)
    private establishmentRepo: Repository<Establishment>,
    private companiesService: CompaniesService,
  ) {}

  async create(establishmentId: string, dto: CreateEmissionPointDto) {
    const establishment = await this.establishmentRepo.findOne({
      where: { id: establishmentId },
      relations: ['company'],
    });
    if (!establishment) throw new NotFoundException('Establecimiento no encontrado');

    const companyId = establishment.company?.id;
    if (companyId) {
      const canAdd = await this.companiesService.checkResourceLimit(companyId, 'max_emission_points');
      if (!canAdd) {
        throw new ForbiddenException(
          'Has alcanzado el límite de Puntos de Emisión permitidos en tu plan actual. Contacta al administrador para mejorar tu suscripción.',
        );
      }
    }

    const newPoint = this.pointRepo.create({
      ...dto,
      establishment,
    });
    return this.pointRepo.save(newPoint);
  }

  async getEmissionPointLimitInfo(companyId: string): Promise<{ count: number; limit: number }> {
    return this.companiesService.getEmissionPointLimitInfo(companyId);
  }

  async findAllByEstablishment(establishmentId: string) {
    return this.pointRepo.find({
      where: { establishment: { id: establishmentId } },
      order: { code: 'ASC' },
    });
  }

  async update(id: string, dto: UpdateEmissionPointDto): Promise<EmissionPoint> {
    // Load with establishment relation (and nested company) so establishment_id is never overwritten
    const point = await this.pointRepo.findOne({
      where: { id },
      relations: ['establishment', 'establishment.company'],
    });
    if (!point) throw new NotFoundException('Punto de emisión no encontrado');
    // Actualizar solo campos del DTO para no tocar la relación establishment
    const fields: (keyof UpdateEmissionPointDto)[] = [
      'code',
      'name',
      'invoice_sequence',
      'proforma_sequence',
      'order_sequence',
      'delivery_note_sequence',
      'dispatch_sequence',
    ];
    for (const key of fields) {
      if (dto[key] !== undefined) (point as unknown as Record<string, unknown>)[key] = dto[key];
    }
    return this.pointRepo.save(point);
  }

  async remove(id: string): Promise<EmissionPoint> {
    const point = await this.pointRepo.findOne({
      where: { id },
      relations: ['establishment', 'establishment.company'],
    });
    if (!point) throw new NotFoundException('Punto de emisión no encontrado');
    point.isActive = false;
    return this.pointRepo.save(point);
  }

  async activate(id: string): Promise<EmissionPoint> {
    const point = await this.pointRepo.findOne({
      where: { id },
      relations: ['establishment', 'establishment.company'],
    });
    if (!point) throw new NotFoundException('Punto de emisión no encontrado');
    point.isActive = true;
    return this.pointRepo.save(point);
  }
}