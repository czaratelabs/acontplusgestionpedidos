import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  NotFoundException,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubscriptionPlan } from './entities/subscription-plan.entity';
import { UpdateSubscriptionPlanDto } from './dto/update-subscription-plan.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../common/guards/super-admin.guard';

@Controller('subscription-plans')
@UseGuards(JwtAuthGuard)
export class SubscriptionPlansController {
  constructor(
    @InjectRepository(SubscriptionPlan)
    private readonly planRepository: Repository<SubscriptionPlan>,
  ) {}

  @Get()
  findAll() {
    return this.planRepository.find({
      order: { price: 'ASC' },
    });
  }

  @Patch(':id')
  @UseGuards(SuperAdminGuard)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateSubscriptionPlanDto,
  ) {
    const plan = await this.planRepository.findOne({ where: { id } });
    if (!plan) throw new NotFoundException('Plan no encontrado');

    const limitsToApply = dto.limits ?? plan.limits;
    if (limitsToApply && typeof limitsToApply === 'object') {
      const maxTotal = limitsToApply['max_total_users'];
      const maxSellers = limitsToApply['max_sellers'];
      if (
        maxTotal != null &&
        maxSellers != null &&
        maxTotal !== -1 &&
        maxSellers !== -1 &&
        Number(maxSellers) > Number(maxTotal)
      ) {
        throw new BadRequestException(
          'El límite de vendedores no puede ser superior al límite total de usuarios.',
        );
      }
    }

    if (dto.name !== undefined) plan.name = dto.name;
    if (dto.price !== undefined) plan.price = String(dto.price);
    if (dto.implementationFee !== undefined) plan.implementationFee = String(dto.implementationFee);
    if (dto.limits !== undefined) plan.limits = dto.limits;
    if (dto.modules !== undefined) plan.modules = dto.modules;
    if (dto.isActive !== undefined) plan.isActive = dto.isActive;
    return this.planRepository.save(plan);
  }
}
