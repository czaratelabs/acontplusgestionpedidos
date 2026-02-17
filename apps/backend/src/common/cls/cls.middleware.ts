import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ClsService } from './cls-context.service';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class ClsMiddleware implements NestMiddleware {
  constructor(
    private readonly clsService: ClsService,
    private readonly jwtService: JwtService,
  ) {}

  use(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    let userId: string = 'system';

    if (authHeader?.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const decoded = this.jwtService.decode(token) as any;
        // Captura el UUID del campo 'sub' (estándar JWT) o 'id'
        userId = decoded?.sub || decoded?.id || 'system';
      } catch (e) {
        console.error('Error decodificando token en Middleware');
      }
    }

    this.clsService.run({ userId, timestamp: new Date() }, () => {
      next();
    });
  }
}