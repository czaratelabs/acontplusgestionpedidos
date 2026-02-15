import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as { role?: string } | undefined;
    const role = user?.role;
    if (role === 'admin' || role === 'owner') return true;
    throw new ForbiddenException('Solo administradores pueden realizar esta acción');
  }
}
