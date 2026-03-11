import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { JwtSignOptions } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { CompaniesService } from '../companies/companies.service';
import { RolesService } from '../roles/roles.service';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';

export interface CompanyAssignment {
  companyId: string;
  companyName?: string;
  role: string;
  permissions?: Record<string, unknown>;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private companiesService: CompaniesService,
    private rolesService: RolesService,
    private jwtService: JwtService,
  ) {}

  async signIn(email: string, pass: string): Promise<
    | {
        step: 'select_company';
        companies: CompanyAssignment[];
        sessionToken: string;
        user: { id: string; name: string; email: string };
      }
    | {
        access_token: string;
        user: {
          id: string;
          name: string;
          email: string;
          companies: CompanyAssignment[];
          companyId: string | null;
          role: string;
          permissions?: Record<string, unknown>;
          isSuperAdmin?: boolean;
        };
      }
  > {
    const user = await this.usersService.findOneByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    const isMatch = await bcrypt.compare(pass, user.password_hash);
    if (!isMatch) {
      if (user.password_hash === pass) {
        // Legacy: allow plain password (temporary)
      } else {
        throw new UnauthorizedException('Credenciales incorrectas');
      }
    }

    // SuperAdmin (is_super_admin) logs in directly in Global Mode — no company required
    const isSuperAdmin = user.is_super_admin === true;
    if (isSuperAdmin) {
      const payload = {
        sub: user.id,
        username: user.email,
        name: user.full_name,
        companyId: null,
        role: 'super_admin',
        permissions: { '*': true },
        isSuperAdmin: true,
      };
      return {
        access_token: await this.jwtService.signAsync(payload),
        user: {
          id: user.id,
          name: user.full_name,
          email: user.email,
          companies: [],
          companyId: null,
          role: 'super_admin',
          permissions: { '*': true },
          isSuperAdmin: true,
        },
      };
    }

    const companies: CompanyAssignment[] = (user.userCompanies ?? [])
      .filter((uc) => uc.isActive && uc.company)
      .map((uc) => ({
        companyId: uc.company.id,
        companyName: uc.company.name,
        role: uc.role?.name ?? 'seller',
        permissions: uc.role?.permissions ?? {},
      }));

    if (companies.length === 0) {
      this.logger.warn(
        `signIn: usuario ${user.id} (${email}) autenticado ` +
          `pero sin empresas activas. userCompanies cargadas: ` +
          `${user.userCompanies?.length ?? 0}`,
      );
      throw new UnauthorizedException(
        'Usuario sin acceso a ninguna empresa. Contacte al administrador.',
      );
    }

    if (companies.length > 1) {
      const sessionToken = await this.jwtService.signAsync(
        { sub: user.id, purpose: 'company_selection' },
        { expiresIn: '5m' },
      );
      return {
        step: 'select_company',
        companies,
        sessionToken,
        user: {
          id: user.id,
          name: user.full_name,
          email: user.email,
        },
      };
    }

    const primary = companies[0];
    const payload = {
      sub: user.id,
      username: user.email,
      name: user.full_name,
      companyId: primary.companyId,
      role: primary.role,
      permissions: primary.permissions ?? {},
    };

    return {
      access_token: await this.jwtService.signAsync(payload),
      user: {
        id: user.id,
        name: user.full_name,
        email: user.email,
        companies,
        companyId: primary.companyId,
        role: primary.role,
        permissions: primary.permissions ?? {},
      },
    };
  }

  /**
   * Renueva el JWT a partir de un token expirado o próximo a expirar.
   * Verifica la firma ignorando expiración (ventana de gracia); no acepta tokens de selección de empresa.
   */
  async refreshToken(oldToken: string): Promise<{ access_token: string }> {
    const trimmed = (oldToken ?? '').trim();
    if (!trimmed) {
      throw new UnauthorizedException('Token requerido');
    }
    let payload: {
      sub?: string;
      purpose?: string;
      username?: string;
      name?: string;
      companyId?: string | null;
      role?: string;
      permissions?: Record<string, unknown>;
      isSuperAdmin?: boolean;
    };
    try {
      payload = await this.jwtService.verifyAsync(trimmed, {
        ignoreExpiration: true,
      });
    } catch {
      throw new UnauthorizedException('Token inválido o corrupto');
    }
    if (payload.purpose === 'company_selection') {
      throw new UnauthorizedException(
        'Este token no se puede refrescar. Selecciona empresa de nuevo.',
      );
    }
    if (!payload.sub) {
      throw new UnauthorizedException('Token sin sujeto');
    }
    const user = await this.usersService.findOneById(payload.sub);
    if (!user) throw new UnauthorizedException('Usuario no encontrado');

    const signOptions: JwtSignOptions = { expiresIn: '8h' };
    if (payload.isSuperAdmin === true || user.is_super_admin === true) {
      const jwtPayload = {
        sub: user.id,
        username: user.email,
        name: user.full_name,
        companyId: null,
        role: 'super_admin',
        permissions: { '*': true },
        isSuperAdmin: true,
      };
      return {
        access_token: await this.jwtService.signAsync(jwtPayload, signOptions),
      };
    }

    const companyId = payload.companyId ?? null;
    if (companyId) {
      const assignment = (user.userCompanies ?? []).find(
        (uc) => uc.companyId === companyId && uc.isActive && uc.company,
      );
      if (!assignment) {
        throw new UnauthorizedException('Sesión ya no válida para esta empresa');
      }
      const roleName = assignment.role?.name ?? payload.role ?? 'seller';
      const permissions = assignment.role?.permissions ?? payload.permissions ?? {};
      const jwtPayload = {
        sub: user.id,
        username: user.email,
        name: user.full_name,
        companyId: assignment.companyId,
        role: roleName,
        permissions,
      };
      return {
        access_token: await this.jwtService.signAsync(jwtPayload, signOptions),
      };
    }

    // Sin companyId en payload: reemitir con los mismos claims si el usuario sigue activo
    const jwtPayload = {
      sub: user.id,
      username: user.email,
      name: user.full_name,
      companyId: null,
      role: payload.role ?? 'seller',
      permissions: payload.permissions ?? {},
      ...(payload.isSuperAdmin ? { isSuperAdmin: true } : {}),
    };
    return {
      access_token: await this.jwtService.signAsync(jwtPayload, signOptions),
    };
  }

  async selectCompany(
    sessionToken: string,
    companyId: string | null,
  ): Promise<{
    access_token: string;
    user: {
      id: string;
      name: string;
      email: string;
      companies: CompanyAssignment[];
      companyId: string | null;
      role: string;
      permissions?: Record<string, unknown>;
    };
  }> {
    const payload = await this.jwtService.verifyAsync(sessionToken);
    if (payload.purpose !== 'company_selection') {
      throw new UnauthorizedException('Token inválido. Vuelve a iniciar sesión.');
    }

    const user = await this.usersService.findOneById(payload.sub);
    if (!user) throw new UnauthorizedException('Usuario no encontrado');

    const isSuperAdmin = user.is_super_admin === true;
    const superAdminFromRole = (user.userCompanies ?? []).find(
      (uc) => uc.isActive && uc.role?.name?.toUpperCase() === 'SUPER_ADMIN',
    );

    // SuperAdmin (is_super_admin or legacy role) can select null/global for full access without company scope
    if (
      (!companyId || companyId === '__global__') &&
      (isSuperAdmin || superAdminFromRole)
    ) {
      const roleName = superAdminFromRole?.role?.name ?? 'super_admin';
      const permissions = superAdminFromRole?.role?.permissions ?? { '*': true };
      const jwtPayload = {
        sub: user.id,
        username: user.email,
        name: user.full_name,
        companyId: null,
        role: roleName,
        permissions,
        isSuperAdmin: true,
      };
      const companies: CompanyAssignment[] = (user.userCompanies ?? [])
        .filter((uc) => uc.isActive && uc.company)
        .map((uc) => ({
          companyId: uc.company.id,
          companyName: uc.company.name,
          role: uc.role?.name ?? 'seller',
          permissions: uc.role?.permissions ?? {},
        }));
      return {
        access_token: await this.jwtService.signAsync(jwtPayload),
        user: {
          id: user.id,
          name: user.full_name,
          email: user.email,
          companies,
          companyId: null,
          role: roleName,
          permissions,
        },
      };
    }

    const assignment = (user.userCompanies ?? []).find(
      (uc) => uc.companyId === companyId && uc.isActive && uc.company,
    );
    if (!assignment) {
      throw new UnauthorizedException('No tienes acceso a esta empresa');
    }

    const roleName = assignment.role?.name ?? 'seller';
    const permissions = assignment.role?.permissions ?? {};
    const jwtPayload = {
      sub: user.id,
      username: user.email,
      name: user.full_name,
      companyId: assignment.companyId,
      role: roleName,
      permissions,
    };

    const companies: CompanyAssignment[] = (user.userCompanies ?? [])
      .filter((uc) => uc.isActive && uc.company)
      .map((uc) => ({
        companyId: uc.company.id,
        companyName: uc.company.name,
        role: uc.role?.name ?? 'seller',
        permissions: uc.role?.permissions ?? {},
      }));

    return {
      access_token: await this.jwtService.signAsync(jwtPayload),
      user: {
        id: user.id,
        name: user.full_name,
        email: user.email,
        companies,
        companyId: assignment.companyId,
        role: roleName,
        permissions,
      },
    };
  }

  async register(dto: RegisterDto): Promise<{ message: string; companyId: string }> {
    const existingUser = await this.usersService.findOneByEmail(dto.email);
    if (existingUser) {
      throw new ConflictException('Ya existe una cuenta con este correo electrónico');
    }

    // Asegurar que los roles del sistema existan
    await this.ensureSystemRoles();

    const company = await this.companiesService.create({
      name: dto.company_name,
      ruc_nit: dto.company_ruc_nit,
    });

    await this.usersService.createEmployee(company.id, {
      full_name: dto.full_name,
      email: dto.email,
      password: dto.password,
      role: 'admin',
    });

    return {
      message: 'Cuenta creada correctamente. Ya puedes iniciar sesión.',
      companyId: company.id,
    };
  }

  /**
   * Asegura que los roles del sistema (admin, seller, owner, super_admin) existan.
   * Los crea si no existen. Si ya existen (NotFoundException al buscar o ConflictException al crear),
   * se continúa sin error.
   */
  private async ensureSystemRoles(): Promise<void> {
    const systemRoles = ['admin', 'seller', 'owner', 'super_admin'];

    for (const roleName of systemRoles) {
      try {
        await this.rolesService.findByNameForCompany(roleName, null);
        // Rol ya existe, continuar
      } catch (error) {
        if (error instanceof NotFoundException) {
          try {
            await this.rolesService.create({
              name: roleName,
              description: `Rol del sistema: ${roleName}`,
              companyId: null,
              isActive: true,
            });
          } catch (createError) {
            // Rol creado por otra petición en paralelo (race condition)
            if (createError instanceof ConflictException) {
              continue;
            }
            throw createError;
          }
        } else {
          throw error;
        }
      }
    }
  }
}
