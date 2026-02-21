import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as { role?: string; isSuperAdmin?: boolean } | undefined;
    const role = user?.role;
    const isSuperAdmin =
      user?.isSuperAdmin === true || role?.toUpperCase() === 'SUPER_ADMIN';
    if (isSuperAdmin) return true;
    throw new ForbiddenException('Solo SuperAdmin puede realizar esta acción');
  }
}
