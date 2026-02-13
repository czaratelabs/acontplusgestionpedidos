import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmissionPoint } from './entities/emission-point.entity';
import { Establishment } from '../establishments/entities/establishment.entity';
import { CreateEmissionPointDto } from './dto/create-emission-point.dto';
import { UpdateEmissionPointDto } from './dto/update-emission-point.dto';

@Injectable()
export class EmissionPointsService {
  constructor(
    @InjectRepository(EmissionPoint)
    private pointRepo: Repository<EmissionPoint>,
    @InjectRepository(Establishment)
    private establishmentRepo: Repository<Establishment>,
  ) {}

  async create(establishmentId: string, dto: CreateEmissionPointDto) {
    const establishment = await this.establishmentRepo.findOneBy({ id: establishmentId });
    if (!establishment) throw new NotFoundException('Establecimiento no encontrado');

    const newPoint = this.pointRepo.create({
      ...dto,
      establishment,
    });
    return this.pointRepo.save(newPoint);
  }

  async findAllByEstablishment(establishmentId: string) {
    return this.pointRepo.find({
      where: { establishment: { id: establishmentId } },
      order: { code: 'ASC' },
    });
  }

  async update(id: string, dto: UpdateEmissionPointDto): Promise<EmissionPoint> {
    const point = await this.pointRepo.findOneBy({ id });
    if (!point) throw new NotFoundException('Punto de emisión no encontrado');
    Object.assign(point, dto);
    return this.pointRepo.save(point);
  }
}