import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { JwtService } from '@nestjs/jwt';
import { ClsService } from 'nestjs-cls';
import { auditUserStorage } from './audit-context';

@Injectable()
export class AuthClsMiddleware implements NestMiddleware {
  constructor(
    private readonly jwtService: JwtService,
    private readonly cls: ClsService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const token = this.extractToken(req);
    if (token) {
      try {
        const payload = await this.jwtService.verifyAsync(token);
        const user = { id: payload.sub };
        this.cls.set('user', user);
        return auditUserStorage.run(user, () => next());
      } catch {
        // Token invalid or expired, continue without user
      }
    }
    next();
  }

  private extractToken(req: Request): string | null {
    const auth = req.headers.authorization;
    if (auth?.startsWith('Bearer ')) return auth.slice(7);
    return req.cookies?.token ?? null;
  }
}
