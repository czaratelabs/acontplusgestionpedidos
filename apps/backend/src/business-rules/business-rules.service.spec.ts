import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { BusinessRulesService, RULE_INVENTORY_PREVENT_NEGATIVE_STOCK } from './business-rules.service';
import { BusinessRule } from './entities/business-rule.entity';

describe('BusinessRulesService', () => {
  let service: BusinessRulesService;
  let repo: {
    findOne: jest.Mock;
    find: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };

  const companyId = 'company-1';
  const mockRuleEnabled: Partial<BusinessRule> = {
    id: 'rule-1',
    companyId,
    ruleKey: RULE_INVENTORY_PREVENT_NEGATIVE_STOCK,
    isEnabled: true,
  };
  const mockRuleDisabled: Partial<BusinessRule> = {
    id: 'rule-2',
    companyId,
    ruleKey: RULE_INVENTORY_PREVENT_NEGATIVE_STOCK,
    isEnabled: false,
  };

  beforeEach(async () => {
    repo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BusinessRulesService,
        {
          provide: getRepositoryToken(BusinessRule),
          useValue: repo,
        },
      ],
    }).compile();

    service = module.get<BusinessRulesService>(BusinessRulesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('2.1.4.1 - Validación stock negativo (permite/deniega según regla)', () => {
    it('lanza BadRequestException cuando la regla está habilitada y el stock quedaría negativo', async () => {
      repo.findOne.mockResolvedValue(mockRuleEnabled);

      await expect(
        service.validateStockBeforeDecrement(companyId, 5, 10),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.validateStockBeforeDecrement(companyId, 5, 10),
      ).rejects.toThrow('No hay stock suficiente para realizar esta venta');
    });

    it('no lanza cuando la regla está habilitada y el stock es suficiente', async () => {
      repo.findOne.mockResolvedValue(mockRuleEnabled);

      await expect(
        service.validateStockBeforeDecrement(companyId, 10, 5),
      ).resolves.not.toThrow();

      await expect(
        service.validateStockBeforeDecrement(companyId, 10, 10),
      ).resolves.not.toThrow();
    });

    it('permite stock negativo cuando la regla está deshabilitada', async () => {
      repo.findOne.mockResolvedValue(mockRuleDisabled);

      await expect(
        service.validateStockBeforeDecrement(companyId, 5, 10),
      ).resolves.not.toThrow();
    });
  });

  describe('2.1.4.2 - Lectura de reglas por empresa', () => {
    it('getRule retorna la regla cuando existe', async () => {
      repo.findOne.mockResolvedValue(mockRuleEnabled);

      const result = await service.getRule(companyId, RULE_INVENTORY_PREVENT_NEGATIVE_STOCK);

      expect(result).toEqual(mockRuleEnabled);
      expect(repo.findOne).toHaveBeenCalledWith({
        where: { companyId, ruleKey: RULE_INVENTORY_PREVENT_NEGATIVE_STOCK },
      });
    });

    it('getRule retorna null cuando no existe', async () => {
      repo.findOne.mockResolvedValue(null);

      const result = await service.getRule(companyId, RULE_INVENTORY_PREVENT_NEGATIVE_STOCK);

      expect(result).toBeNull();
    });

    it('getAllForCompany retorna reglas ordenadas por ruleKey', async () => {
      const rules = [
        { ...mockRuleEnabled, ruleKey: 'RULE_B' },
        { ...mockRuleDisabled, ruleKey: 'RULE_A' },
      ];
      repo.find.mockResolvedValue(rules);

      const result = await service.getAllForCompany(companyId);

      expect(result).toEqual(rules);
      expect(repo.find).toHaveBeenCalledWith({
        where: { companyId },
        order: { ruleKey: 'ASC' },
      });
    });

    it('checkRule retorna true cuando la regla existe y está habilitada', async () => {
      repo.findOne.mockResolvedValue(mockRuleEnabled);

      const result = await service.checkRule(companyId, RULE_INVENTORY_PREVENT_NEGATIVE_STOCK);

      expect(result).toBe(true);
    });

    it('checkRule retorna false cuando la regla existe y está deshabilitada', async () => {
      repo.findOne.mockResolvedValue(mockRuleDisabled);

      const result = await service.checkRule(companyId, RULE_INVENTORY_PREVENT_NEGATIVE_STOCK);

      expect(result).toBe(false);
    });
  });

  describe('2.1.4.3 - Valores por defecto si no hay reglas configuradas', () => {
    it('checkRule retorna false cuando la regla no existe', async () => {
      repo.findOne.mockResolvedValue(null);

      const result = await service.checkRule(companyId, RULE_INVENTORY_PREVENT_NEGATIVE_STOCK);

      expect(result).toBe(false);
    });

    it('getRule retorna null cuando la regla no existe', async () => {
      repo.findOne.mockResolvedValue(null);

      const result = await service.getRule(companyId, RULE_INVENTORY_PREVENT_NEGATIVE_STOCK);

      expect(result).toBeNull();
    });

    it('validateStockBeforeDecrement permite stock negativo cuando la regla no está configurada', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(
        service.validateStockBeforeDecrement(companyId, 5, 10),
      ).resolves.not.toThrow();
    });

    it('getAllForCompany retorna array vacío cuando no hay reglas', async () => {
      repo.find.mockResolvedValue([]);

      const result = await service.getAllForCompany(companyId);

      expect(result).toEqual([]);
    });
  });
});
