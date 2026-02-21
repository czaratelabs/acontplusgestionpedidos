import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UserCompany } from './entities/user-company.entity';
import { Company } from '../companies/entities/company.entity';
import { CompaniesService } from '../companies/companies.service';
import { RolesService } from '../roles/roles.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(UserCompany)
    private userCompanyRepository: Repository<UserCompany>,
    @InjectRepository(Company)
    private companyRepository: Repository<Company>,
    private companiesService: CompaniesService,
    private rolesService: RolesService,
  ) {}

  async findOneById(id: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id },
      relations: ['userCompanies', 'userCompanies.company', 'userCompanies.role'],
    });
  }

  async findOneByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email },
      relations: ['userCompanies', 'userCompanies.company', 'userCompanies.role'],
    });
  }

  async findAllByCompany(
    companyId: string,
  ): Promise<Array<{ id: string; full_name: string; email: string; created_at: Date; role: string }>> {
    const userCompanies = await this.userCompanyRepository.find({
      where: { companyId, isActive: true },
      relations: ['user', 'role'],
      order: { user: { created_at: 'DESC' } },
    });

    return userCompanies.map((uc) => ({
      id: uc.user.id,
      full_name: uc.user.full_name,
      email: uc.user.email,
      created_at: uc.user.created_at,
      role: uc.role.name,
    }));
  }

  async createEmployee(
    companyId: string,
    createUserDto: CreateUserDto,
  ): Promise<{ id: string; full_name: string; email: string; created_at: Date; role: string }> {
    const company = await this.companyRepository.findOneBy({ id: companyId });
    if (!company) throw new NotFoundException('Empresa no encontrada');

    const roleName = createUserDto.role ?? 'seller';
    await this.companiesService.assertUserCreationLimit(companyId, roleName);
    const role = await this.rolesService.findByNameForCompany(roleName, companyId);

    let user = await this.userRepository.findOne({
      where: { email: createUserDto.email },
      relations: ['userCompanies'],
    });

    if (user) {
      const alreadyInCompany = user.userCompanies?.some((uc) => uc.companyId === companyId);
      if (alreadyInCompany) {
        throw new ConflictException('Este usuario ya está asignado a esta empresa');
      }
    } else {
      const salt = await bcrypt.genSalt();
      const password_hash = await bcrypt.hash(createUserDto.password, salt);
      user = this.userRepository.create({
        full_name: createUserDto.full_name,
        email: createUserDto.email,
        password_hash,
      });
      user = await this.userRepository.save(user);
    }

    const userCompany = this.userCompanyRepository.create({
      userId: user.id,
      companyId,
      roleId: role.id,
      isActive: true,
    });
    await this.userCompanyRepository.save(userCompany);

    return {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      created_at: user.created_at,
      role: role.name,
    };
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['userCompanies', 'userCompanies.company'],
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    if (dto.full_name !== undefined) user.full_name = dto.full_name;
    if (dto.email !== undefined) user.email = dto.email;

    if (
      dto.password !== undefined &&
      dto.password !== null &&
      String(dto.password).trim() !== ''
    ) {
      const salt = await bcrypt.genSalt();
      user.password_hash = await bcrypt.hash(dto.password.trim(), salt);
    }

    await this.userRepository.save(user);

    if (dto.role != null && dto.role !== '' && dto.companyId != null && dto.companyId !== '') {
      const companyIdTrim = dto.companyId.trim();
      const roleName = String(dto.role).trim().toLowerCase();
      const userCompany = await this.userCompanyRepository.findOne({
        where: { userId: id, companyId: companyIdTrim, isActive: true },
      });
      if (userCompany) {
        const role = await this.rolesService.findByNameForCompany(roleName, companyIdTrim);
        userCompany.roleId = role.id;
        userCompany.role = role;
        await this.userCompanyRepository.save(userCompany);
      }
    }

    return this.userRepository.findOne({
      where: { id },
      relations: ['userCompanies', 'userCompanies.company', 'userCompanies.role'],
    }) as Promise<User>;
  }

  /**
   * Get users that exist in the system but are NOT assigned to the given company.
   * Used for "Assign existing user to company" flow.
   */
  async findAvailableForCompany(
    companyId: string,
  ): Promise<Array<{ id: string; full_name: string; email: string }>> {
    const alreadyAssigned = await this.userCompanyRepository.find({
      where: { companyId, isActive: true },
      select: ['userId'],
    });
    const assignedIds = alreadyAssigned.map((uc) => uc.userId);

    if (assignedIds.length === 0) {
      const all = await this.userRepository.find({
        select: ['id', 'full_name', 'email'],
        order: { full_name: 'ASC' },
      });
      return all;
    }

    const available = await this.userRepository
      .createQueryBuilder('u')
      .select(['u.id', 'u.full_name', 'u.email'])
      .where('u.id NOT IN (:...ids)', { ids: assignedIds })
      .orderBy('u.full_name', 'ASC')
      .getMany();

    return available;
  }

  /**
   * Assign an existing user to a company with a role.
   */
  async assignUserToCompany(
    companyId: string,
    userId: string,
    role: string,
  ): Promise<{ id: string; full_name: string; email: string; role: string }> {
    const company = await this.companyRepository.findOneBy({ id: companyId });
    if (!company) throw new NotFoundException('Empresa no encontrada');

    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['userCompanies'],
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const alreadyInCompany = user.userCompanies?.some((uc) => uc.companyId === companyId);
    if (alreadyInCompany) {
      throw new ConflictException('Este usuario ya está asignado a esta empresa');
    }

    await this.companiesService.assertUserCreationLimit(companyId, role);

    const roleEntity = await this.rolesService.findByNameForCompany(role, companyId);

    const userCompany = this.userCompanyRepository.create({
      userId,
      companyId,
      roleId: roleEntity.id,
      isActive: true,
    });
    await this.userCompanyRepository.save(userCompany);

    return {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      role: roleEntity.name,
    };
  }

  /**
   * Remove a user from a company (soft: set isActive=false, or hard delete).
   */
  async removeUserFromCompany(userId: string, companyId: string): Promise<void> {
    const uc = await this.userCompanyRepository.findOne({
      where: { userId, companyId },
    });
    if (!uc) throw new NotFoundException('Asignación no encontrada');
    await this.userCompanyRepository.remove(uc);
  }

  /**
   * Returns total and sellers limit info. Used by frontend to disable buttons and validate by role.
   */
  async getUserLimitInfo(companyId: string): Promise<{
    totalCount: number;
    totalLimit: number;
    sellersCount: number;
    sellersLimit: number;
  }> {
    return this.companiesService.getUserLimitInfo(companyId);
  }

  /**
   * Get the effective role for a user in a specific company.
   */
  async getRoleForCompany(userId: string, companyId: string): Promise<string | null> {
    const uc = await this.userCompanyRepository.findOne({
      where: { userId, companyId, isActive: true },
      relations: ['role'],
    });
    return uc?.role?.name ?? null;
  }
}
