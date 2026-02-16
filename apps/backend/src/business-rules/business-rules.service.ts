import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusinessRule } from './entities/business-rule.entity';

export const RULE_INVENTORY_PREVENT_NEGATIVE_STOCK =
  'INVENTORY_PREVENT_NEGATIVE_STOCK';

@Injectable()
export class BusinessRulesService {
  constructor(
    @InjectRepository(BusinessRule)
    private readonly repo: Repository<BusinessRule>,
  ) {}

  async checkRule(companyId: string, ruleKey: string): Promise<boolean> {
    const rule = await this.repo.findOne({
      where: { companyId, ruleKey },
    });
    return rule?.isEnabled ?? false;
  }

  /**
   * Validates that stock can be decremented. Throws BadRequestException if
   * INVENTORY_PREVENT_NEGATIVE_STOCK is enabled and the operation would
   * result in negative stock.
   * Call this before decrementing stock in Orders/Inventory services.
   */
  async validateStockBeforeDecrement(
    companyId: string,
    currentStock: number,
    requestedQuantity: number,
  ): Promise<void> {
    const isEnabled = await this.checkRule(
      companyId,
      RULE_INVENTORY_PREVENT_NEGATIVE_STOCK,
    );
    if (isEnabled && currentStock - requestedQuantity < 0) {
      throw new BadRequestException(
        'No hay stock suficiente para realizar esta venta (Regla de Negocio Activa).',
      );
    }
  }

  async getRule(
    companyId: string,
    ruleKey: string,
  ): Promise<BusinessRule | null> {
    return this.repo.findOne({
      where: { companyId, ruleKey },
    });
  }

  async setRule(
    companyId: string,
    ruleKey: string,
    isEnabled: boolean,
    metadata?: Record<string, unknown> | null,
  ): Promise<BusinessRule> {
    let rule = await this.repo.findOne({
      where: { companyId, ruleKey },
    });
    if (!rule) {
      rule = this.repo.create({
        companyId,
        ruleKey,
        isEnabled,
        metadata: metadata ?? null,
      });
    } else {
      rule.isEnabled = isEnabled;
      if (metadata !== undefined) rule.metadata = metadata;
    }
    return this.repo.save(rule);
  }

  async getAllForCompany(companyId: string): Promise<BusinessRule[]> {
    return this.repo.find({
      where: { companyId },
      order: { ruleKey: 'ASC' },
    });
  }
}
