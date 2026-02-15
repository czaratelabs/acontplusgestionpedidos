import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Role } from './entities/role.entity';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
  ) {}

  async findAll(companyId?: string | null): Promise<Role[]> {
    if (companyId) {
      return this.roleRepository.find({
        where: [
          { companyId: IsNull(), isActive: true },
          { companyId, isActive: true },
        ],
        order: { name: 'ASC' },
      });
    }
    return this.roleRepository.find({
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Role> {
    const role = await this.roleRepository.findOne({ where: { id } });
    if (!role) {
      throw new NotFoundException(`Rol no encontrado: ${id}`);
    }
    return role;
  }

  async create(dto: CreateRoleDto): Promise<Role> {
    const name = dto.name.trim().toLowerCase();
    const companyId = dto.companyId?.trim() || null;

    await this.assertNameUnique(name, companyId, null);

    const role = this.roleRepository.create({
      name,
      description: dto.description?.trim() || null,
      isActive: dto.isActive ?? true,
      companyId,
    });
    return this.roleRepository.save(role);
  }

  async update(id: string, dto: UpdateRoleDto): Promise<Role> {
    const role = await this.findOne(id);
    const name = dto.name !== undefined ? dto.name.trim().toLowerCase() : role.name;
    const companyId = dto.companyId !== undefined ? (dto.companyId?.trim() || null) : role.companyId;

    if (dto.name !== undefined) {
      await this.assertNameUnique(name, companyId, id);
    }

    if (dto.name !== undefined) role.name = name;
    if (dto.description !== undefined) role.description = dto.description?.trim() || null;
    if (dto.isActive !== undefined) role.isActive = dto.isActive;
    if (dto.companyId !== undefined) role.companyId = companyId;

    return this.roleRepository.save(role);
  }

  async remove(id: string): Promise<void> {
    const role = await this.findOne(id);
    await this.roleRepository.remove(role);
  }

  private async assertNameUnique(
    name: string,
    companyId: string | null,
    excludeId: string | null,
  ): Promise<void> {
    const qb = this.roleRepository
      .createQueryBuilder('r')
      .where('LOWER(r.name) = :name', { name });

    if (companyId === null) {
      qb.andWhere('r.company_id IS NULL');
    } else {
      qb.andWhere('r.company_id = :companyId', { companyId });
    }

    if (excludeId) {
      qb.andWhere('r.id != :excludeId', { excludeId });
    }

    const existing = await qb.getOne();
    if (existing) {
      throw new ConflictException(
        `Ya existe un rol con el nombre "${name}"${companyId ? ' en esta empresa' : ' (sistema)'}.`,
      );
    }
  }

  async findByName(name: string): Promise<Role> {
    const role = await this.roleRepository.findOne({
      where: { name: name.toLowerCase() },
    });
    if (!role) {
      throw new NotFoundException(`Rol no encontrado: ${name}`);
    }
    return role;
  }

  async findByNameForCompany(
    name: string,
    companyId?: string | null,
  ): Promise<Role> {
    const normalized = name.toLowerCase();
    if (companyId) {
      const companyRole = await this.roleRepository.findOne({
        where: { name: normalized, companyId },
      });
      if (companyRole) return companyRole;
    }
    const systemRole = await this.roleRepository.findOne({
      where: { name: normalized, companyId: IsNull() },
    });
    if (!systemRole) {
      throw new NotFoundException(`Rol no encontrado: ${name}`);
    }
    return systemRole;
  }
}
