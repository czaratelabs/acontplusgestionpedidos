import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { JwtService } from '@nestjs/jwt';
import { ClsService } from './cls/cls-context.service';
import { auditUserStorage } from './audit-context';

@Injectable()
export class AuthClsMiddleware implements NestMiddleware {
  constructor(
    private readonly jwtService: JwtService,
    private readonly cls: ClsService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    const token = this.extractToken(req);

    if (token) {
      try {
        const payload = await this.jwtService.verifyAsync(token);
        const user = { id: payload.sub };

        // Crear contexto ClsService y envolver next en auditUserStorage para que
        // el subscriber de TypeORM pueda leer el usuario desde auditUserStorage.getStore()
        this.cls.run({ userId: payload.sub, timestamp: new Date() }, () => {
          this.cls.set('user', user);
          auditUserStorage.run(user, () => next());
        });
        return;
      } catch {
        // Token inválido o expirado — continuar sin usuario
      }
    }

    // Sin token o token inválido: crear contexto ClsService con system y llamar next()
    this.cls.run({ userId: 'system', timestamp: new Date() }, () => next());
  }

  private extractToken(req: Request): string | null {
    const auth = req.headers.authorization;
    if (auth?.startsWith('Bearer ')) return auth.slice(7);
    return req.cookies?.token ?? null;
  }
}
