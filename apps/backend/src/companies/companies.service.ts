import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { AssignSubscriptionDto } from './dto/assign-subscription.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { Company } from './entities/company.entity';
import { UserCompany } from '../users/entities/user-company.entity';
import { Establishment } from '../establishments/entities/establishment.entity';
import { Warehouse } from '../warehouses/entities/warehouse.entity';
import { EmissionPoint } from '../emission-points/entities/emission-point.entity';
import { Contact } from '../contacts/entities/contact.entity';
import { ClsService } from '../common/cls/cls-context.service';

@Injectable()
export class CompaniesService {
  constructor(
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    @InjectRepository(UserCompany)
    private readonly userCompanyRepository: Repository<UserCompany>,
    @InjectRepository(Establishment)
    private readonly establishmentRepository: Repository<Establishment>,
    @InjectRepository(Warehouse)
    private readonly warehouseRepository: Repository<Warehouse>,
    @InjectRepository(EmissionPoint)
    private readonly emissionPointRepository: Repository<EmissionPoint>,
    @InjectRepository(Contact)
    private readonly contactRepository: Repository<Contact>,
    private readonly cls: ClsService,
  ) {}

  async create(createCompanyDto: CreateCompanyDto): Promise<Company> {
    const newCompany = this.companyRepository.create(createCompanyDto);
    return await this.companyRepository.save(newCompany);
  }

  async findAll(): Promise<Company[]> {
    return await this.companyRepository.find();
  }

  // Los métodos reciben id como string para soportar UUIDs
  async findOne(id: string): Promise<Company | null> {
    return await this.companyRepository.findOne({
      where: { id },
      relations: ['plan'],
    });
  }

  async update(id: string, updateCompanyDto: UpdateCompanyDto): Promise<Company> {
    const company = await this.companyRepository.findOneBy({ id });
    if (!company) throw new NotFoundException('Empresa no encontrada');
    this.companyRepository.merge(company, updateCompanyDto);
    return this.companyRepository.save(company);
  }

  async updateSubscription(
    companyId: string,
    dto: AssignSubscriptionDto,
  ): Promise<Company> {
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
    });
    if (!company) throw new NotFoundException('Empresa no encontrada');

    await this.companyRepository.update(companyId, {
      planId: dto.planId,
      subscriptionStartDate: new Date(dto.startDate),
      subscriptionEndDate: new Date(dto.endDate),
      subscriptionPeriod: dto.period,
    });

    const updated = await this.companyRepository.findOne({
      where: { id: companyId },
      relations: ['plan'],
    });
    if (!updated) throw new NotFoundException('Empresa no encontrada');
    return updated;
  }

  async remove(id: string): Promise<void> {
    await this.companyRepository.delete(id);
  }

  /**
   * Resolves the company ID from an establishment ID.
   * Use when the request has establishment id in params (e.g. PATCH/DELETE /establishments/:id).
   */
  async getCompanyIdFromEstablishmentId(establishmentId: string): Promise<string | null> {
    const establishment = await this.establishmentRepository.findOne({
      where: { id: establishmentId },
      relations: ['company'],
      select: { id: true, company: { id: true } },
    });
    return establishment?.company?.id ?? null;
  }

  /**
   * Resolves the company ID from a contact ID.
   * Use when the request has contact id in params (e.g. PATCH/DELETE /contacts/:id).
   */
  async getCompanyIdFromContactId(contactId: string): Promise<string | null> {
    const contact = await this.contactRepository.findOne({
      where: { id: contactId },
      relations: ['company'],
      select: { id: true, company: { id: true } },
    });
    return contact?.company?.id ?? null;
  }

  /**
   * Resolves the company ID from a warehouse ID (via establishment).
   */
  async getCompanyIdFromWarehouseId(warehouseId: string): Promise<string | null> {
    const warehouse = await this.warehouseRepository.findOne({
      where: { id: warehouseId },
      relations: ['establishment', 'establishment.company'],
      select: { id: true, establishment: { id: true, company: { id: true } } },
    });
    return warehouse?.establishment?.company?.id ?? null;
  }

  /**
   * Returns true if the company's plan enables the given module.
   * If company has no plan, returns false.
   */
  async isModuleEnabled(companyId: string, moduleKey: string): Promise<boolean> {
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
      relations: ['plan'],
    });
    if (!company?.plan) return false;
    const modules = company.plan.modules as Record<string, boolean> | undefined;
    return modules?.[moduleKey] === true;
  }

  /**
   * Validates that Current Count < Max Allowed for the given limit key.
   * Returns true if the company can add one more resource. Used ONLY during creation (POST).
   * SUPER_ADMIN bypasses all limits. Limit -1 = unlimited. No plan = no limits.
   */
  async checkResourceLimit(companyId: string, limitKey: string): Promise<boolean> {
    const user = this.cls?.get<{ isSuperAdmin?: boolean }>('user');
    if (user?.isSuperAdmin === true) return true;

    const company = await this.companyRepository.findOne({
      where: { id: companyId },
      relations: ['plan'],
    });
    if (!company?.plan) return true;

    const limits = company.plan.limits as Record<string, number> | undefined;
    const rawLimit = limits?.[limitKey];
    if (rawLimit === undefined || rawLimit === null) return true;
    const limit = Number(rawLimit);
    if (limit === -1 || Number.isNaN(limit)) return true;

    let count: number;
    switch (limitKey) {
      case 'max_total_users':
        count = await this.userCompanyRepository.count({
          where: { companyId, isActive: true },
        });
        break;
      case 'max_sellers':
        count = await this.userCompanyRepository
          .createQueryBuilder('uc')
          .innerJoin('uc.role', 'r')
          .where('uc.companyId = :companyId', { companyId })
          .andWhere('uc.isActive = :active', { active: true })
          .andWhere('(LOWER(r.name) LIKE :vendedor OR LOWER(r.name) LIKE :seller)', {
            vendedor: '%vendedor%',
            seller: '%seller%',
          })
          .getCount();
        break;
      case 'max_establishments':
        count = await this.establishmentRepository
          .createQueryBuilder('e')
          .innerJoin('e.company', 'c')
          .where('c.id = :companyId', { companyId })
          .andWhere('e.is_active = :active', { active: true })
          .getCount();
        break;
      case 'max_warehouses':
        count = await this.warehouseRepository
          .createQueryBuilder('w')
          .innerJoin('w.establishment', 'e')
          .innerJoin('e.company', 'c')
          .where('c.id = :companyId', { companyId })
          .andWhere('w.is_active = :active', { active: true })
          .getCount();
        break;
      case 'max_emission_points':
        count = await this.emissionPointRepository
          .createQueryBuilder('ep')
          .innerJoin('ep.establishment', 'e')
          .innerJoin('e.company', 'c')
          .where('c.id = :companyId', { companyId })
          .andWhere('ep.is_active = :active', { active: true })
          .getCount();
        break;
      case 'max_inventory_items':
        // Placeholder: no inventory entity yet - add count when available
        count = 0;
        break;
      case 'storage_gb':
        // Placeholder: storage usage tracked elsewhere - limit -1 = unlimited
        return true;
      default:
        return false;
    }
    return count < limit;
  }

  /**
   * Throws ForbiddenException if the company has reached the resource limit.
   * Call ONLY before creating a new resource (POST/create). Never call on update/delete/activate.
   */
  async assertResourceLimit(companyId: string, limitKey: string, resourceLabel: string): Promise<void> {
    const canAdd = await this.checkResourceLimit(companyId, limitKey);
    if (!canAdd) {
      throw new ForbiddenException(
        `Límite de registros alcanzado. No se pueden añadir más ${resourceLabel}. Mejora tu plan.`,
      );
    }
  }

  /**
   * Asserts user creation limits: max_total_users and, if role is Vendedor, max_sellers.
   * Call ONLY before creating/assigning a user to the company.
   * @param roleName Role of the user being created (e.g. 'seller', 'vendedor', 'admin').
   */
  async assertUserCreationLimit(companyId: string, roleName: string): Promise<void> {
    const user = this.cls?.get<{ isSuperAdmin?: boolean }>('user');
    if (user?.isSuperAdmin === true) return;

    const company = await this.companyRepository.findOne({
      where: { id: companyId },
      relations: ['plan'],
    });
    if (!company?.plan) return;

    const limits = company.plan.limits as Record<string, number> | undefined;
    const rawTotal = limits?.['max_total_users'];
    const rawSellers = limits?.['max_sellers'];

    // 1. Check max_total_users for ANY user creation
    if (rawTotal !== undefined && rawTotal !== null && rawTotal !== -1) {
      const totalLimit = Number(rawTotal);
      if (!Number.isNaN(totalLimit)) {
        const totalCount = await this.userCompanyRepository.count({
          where: { companyId, isActive: true },
        });
        if (totalCount >= totalLimit) {
          throw new ForbiddenException(
            `Has alcanzado el límite total de usuarios (${totalLimit}) de tu plan.`,
          );
        }
      }
    }

    // 2. If role is Vendedor/Seller, also check max_sellers
    const roleLower = String(roleName || '').toLowerCase();
    const isVendedor = roleLower.includes('vendedor') || roleLower.includes('seller');
    if (isVendedor && rawSellers !== undefined && rawSellers !== null && rawSellers !== -1) {
      const sellersLimit = Number(rawSellers);
      if (!Number.isNaN(sellersLimit)) {
        const sellersCount = await this.userCompanyRepository
          .createQueryBuilder('uc')
          .innerJoin('uc.role', 'r')
          .where('uc.companyId = :companyId', { companyId })
          .andWhere('uc.isActive = :active', { active: true })
          .andWhere('(LOWER(r.name) LIKE :vendedor OR LOWER(r.name) LIKE :seller)', {
            vendedor: '%vendedor%',
            seller: '%seller%',
          })
          .getCount();
        if (sellersCount >= sellersLimit) {
          throw new ForbiddenException(
            `Has alcanzado el límite de usuarios con rol de Vendedor (${sellersLimit}) de tu plan.`,
          );
        }
      }
    }
  }

  /**
   * Returns { count, limit } for max_warehouses. limit -1 means unlimited.
   */
  async getWarehouseLimitInfo(companyId: string): Promise<{ count: number; limit: number }> {
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
      relations: ['plan'],
    });
    const count = await this.warehouseRepository
      .createQueryBuilder('w')
      .innerJoin('w.establishment', 'e')
      .innerJoin('e.company', 'c')
      .where('c.id = :companyId', { companyId })
      .andWhere('w.is_active = :active', { active: true })
      .getCount();
    const rawLimit = company?.plan?.limits
      ? (company.plan.limits as Record<string, number>)?.['max_warehouses']
      : undefined;
    const limit = rawLimit === undefined || rawLimit === null ? -1 : Number(rawLimit);
    return { count, limit: Number.isNaN(limit) ? -1 : limit };
  }

  /**
   * Returns { count, limit } for max_establishments. limit -1 means unlimited.
   */
  async getEstablishmentLimitInfo(companyId: string): Promise<{ count: number; limit: number }> {
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
      relations: ['plan'],
    });
    const count = await this.establishmentRepository
      .createQueryBuilder('e')
      .innerJoin('e.company', 'c')
      .where('c.id = :companyId', { companyId })
      .andWhere('e.is_active = :active', { active: true })
      .getCount();
    const rawLimit = company?.plan?.limits
      ? (company.plan.limits as Record<string, number>)?.['max_establishments']
      : undefined;
    const limit = rawLimit === undefined || rawLimit === null ? -1 : Number(rawLimit);
    return { count, limit: Number.isNaN(limit) ? -1 : limit };
  }

  /**
   * Returns { count, limit } for max_emission_points. limit -1 means unlimited.
   */
  async getEmissionPointLimitInfo(companyId: string): Promise<{ count: number; limit: number }> {
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
      relations: ['plan'],
    });
    const count = await this.emissionPointRepository
      .createQueryBuilder('ep')
      .innerJoin('ep.establishment', 'e')
      .innerJoin('e.company', 'c')
      .where('c.id = :companyId', { companyId })
      .andWhere('ep.is_active = :active', { active: true })
      .getCount();
    const rawLimit = company?.plan?.limits
      ? (company.plan.limits as Record<string, number>)?.['max_emission_points']
      : undefined;
    const limit = rawLimit === undefined || rawLimit === null ? -1 : Number(rawLimit);
    return { count, limit: Number.isNaN(limit) ? -1 : limit };
  }

  /**
   * Returns user limit info for total and sellers. Used to disable "Nuevo Usuario" and validate by role.
   * limit -1 means unlimited.
   */
  async getUserLimitInfo(companyId: string): Promise<{
    totalCount: number;
    totalLimit: number;
    sellersCount: number;
    sellersLimit: number;
  }> {
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
      relations: ['plan'],
    });
    const limits = company?.plan?.limits as Record<string, number> | undefined;
    const rawTotal = limits?.['max_total_users'];
    const rawSellers = limits?.['max_sellers'];
    const totalLimit = rawTotal === undefined || rawTotal === null ? -1 : Number(rawTotal);
    const sellersLimit = rawSellers === undefined || rawSellers === null ? -1 : Number(rawSellers);

    const totalCount = await this.userCompanyRepository.count({
      where: { companyId, isActive: true },
    });
    const sellersCount = await this.userCompanyRepository
      .createQueryBuilder('uc')
      .innerJoin('uc.role', 'r')
      .where('uc.companyId = :companyId', { companyId })
      .andWhere('uc.isActive = :active', { active: true })
      .andWhere('(LOWER(r.name) LIKE :vendedor OR LOWER(r.name) LIKE :seller)', {
        vendedor: '%vendedor%',
        seller: '%seller%',
      })
      .getCount();

    return {
      totalCount,
      totalLimit: Number.isNaN(totalLimit) ? -1 : totalLimit,
      sellersCount,
      sellersLimit: Number.isNaN(sellersLimit) ? -1 : sellersLimit,
    };
  }
}
