import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { ClsService } from 'nestjs-cls';
import { UsersService } from '../../users/users.service';

export interface JwtPayload {
  sub: string;
  username?: string;
  companyId?: string;
  role?: string;
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
  ): Promise<{ id: string; full_name: string; email: string; role: string; companyId?: string }> {
    const user = await this.usersService.findOneById(payload.sub);
    if (!user) throw new UnauthorizedException('Usuario no encontrado');

    const companyId = payload.companyId ?? null;
    const role =
      payload.role ??
      (companyId ? await this.usersService.getRoleForCompany(payload.sub, companyId) : null) ??
      'seller';

    const safeUser = {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      role,
      companyId: companyId ?? undefined,
    };
    this.cls.set('user', safeUser);
    return safeUser;
  }
}
