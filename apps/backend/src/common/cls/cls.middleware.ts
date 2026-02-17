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
    let userId: string = 'system';
    
    // 1. Try Authorization header first
    let token: string | undefined;
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
    
    // 2. Fallback: httpOnly cookie 'token'
    if (!token && req.cookies?.token) {
      token = req.cookies.token;
    }
    
    if (token) {
      try {
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