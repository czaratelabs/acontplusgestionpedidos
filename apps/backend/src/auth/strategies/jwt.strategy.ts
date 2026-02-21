import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { ClsService } from '../../common/cls/cls-context.service';
import { UsersService } from '../../users/users.service';

export interface JwtPayload {
  sub: string;
  username?: string;
  name?: string;
  companyId?: string | null;
  role?: string;
  permissions?: Record<string, unknown>;
}

export const SUPER_ADMIN_ROLE = 'super_admin';

export function isSuperAdmin(role: string | undefined): boolean {
  return role?.toUpperCase() === 'SUPER_ADMIN';
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly usersService: UsersService,
    private readonly cls: ClsService,
    config: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req) => {
          const auth = req?.headers?.authorization;
          if (auth?.startsWith('Bearer ')) return auth.slice(7);
          return req?.cookies?.token ?? null;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET') ?? 'CLAVE_SECRETA_SUPER_SEGURA_2026',
    });
  }

  async validate(
    payload: JwtPayload,
  ): Promise<{
    id: string;
    full_name: string;
    email: string;
    role: string;
    companyId?: string;
    permissions?: Record<string, unknown>;
    isSuperAdmin: boolean;
  }> {
    const user = await this.usersService.findOneById(payload.sub);
    if (!user) throw new UnauthorizedException('Usuario no encontrado');

    const role = payload.role ?? 'seller';
    const isSuperAdmin = role?.toUpperCase() === 'SUPER_ADMIN';
    const companyId = payload.companyId ?? null;

    // SUPER_ADMIN has full access even when company_id is null
    const effectiveRole =
      payload.role ??
      (companyId ? await this.usersService.getRoleForCompany(payload.sub, companyId) : null) ??
      (isSuperAdmin ? 'super_admin' : 'seller');

    const safeUser = {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      role: effectiveRole,
      companyId: companyId ?? undefined,
      permissions: payload.permissions ?? {},
      isSuperAdmin: effectiveRole?.toUpperCase() === 'SUPER_ADMIN',
    };
    this.cls.set('user', safeUser);
    return safeUser;
  }
}
