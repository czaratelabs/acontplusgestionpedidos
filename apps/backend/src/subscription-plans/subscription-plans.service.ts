import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubscriptionPlan } from '../companies/entities/subscription-plan.entity';
import { UpdateSubscriptionPlanDto } from './dto/update-subscription-plan.dto';

@Injectable()
export class SubscriptionPlansService {
  constructor(
    @InjectRepository(SubscriptionPlan)
    private readonly planRepository: Repository<SubscriptionPlan>,
  ) {}

  async findAll(): Promise<SubscriptionPlan[]> {
    return this.planRepository.find({
      where: { isActive: true },
      order: { price: 'ASC' },
    });
  }

  async findAllIncludingInactive(): Promise<SubscriptionPlan[]> {
    return this.planRepository.find({
      order: { price: 'ASC' },
    });
  }

  async findOne(id: string): Promise<SubscriptionPlan> {
    const plan = await this.planRepository.findOne({ where: { id } });
    if (!plan) throw new NotFoundException('Plan no encontrado');
    return plan;
  }

  async update(id: string, dto: UpdateSubscriptionPlanDto): Promise<SubscriptionPlan> {
    const plan = await this.planRepository.findOne({ where: { id } });
    if (!plan) throw new NotFoundException('Plan no encontrado');

    if (dto.name !== undefined) plan.name = dto.name;
    if (dto.price !== undefined) plan.price = String(dto.price);
    if (dto.implementationFee !== undefined) plan.implementationFee = String(dto.implementationFee);
    if (dto.limits !== undefined) plan.limits = dto.limits;
    if (dto.modules !== undefined) plan.modules = dto.modules;
    if (dto.isActive !== undefined) plan.isActive = dto.isActive;

    return this.planRepository.save(plan);
  }
}
