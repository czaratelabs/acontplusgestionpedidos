import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  REQUIRE_PERMISSION_KEY,
  RequirePermissionMeta,
} from '../decorators/require-permission.decorator';

type Permissions = Record<string, unknown>;

function hasWildcard(permissions: Permissions | undefined): boolean {
  if (!permissions || typeof permissions !== 'object') return false;
  return permissions['*'] === true;
}

function hasModuleAction(
  permissions: Permissions | undefined,
  module: string,
  action: string,
): boolean {
  if (!permissions || typeof permissions !== 'object') return false;
  const mod = permissions[module];
  if (mod === true) return true;
  if (mod && typeof mod === 'object' && !Array.isArray(mod)) {
    const act = (mod as Record<string, unknown>)[action];
    if (act === true) return true;
    // alias comunes
    if (action === 'edit' && (mod as Record<string, unknown>)['write'] === true)
      return true;
    if (action === 'delete' && (mod as Record<string, unknown>)['remove'] === true)
      return true;
  }
  return false;
}

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const meta = this.reflector.getAllAndOverride<RequirePermissionMeta | undefined>(
      REQUIRE_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!meta) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user as
      | { permissions?: Permissions; isSuperAdmin?: boolean }
      | undefined;
    if (!user) throw new ForbiddenException('No autenticado');

    const permissions = user.permissions as Permissions | undefined;

    if (user.isSuperAdmin === true && hasWildcard(permissions)) {
      return true;
    }
    if (hasWildcard(permissions)) {
      return true;
    }
    if (hasModuleAction(permissions, meta.module, meta.action)) {
      return true;
    }

    // Compatibilidad: roles sin permissions en BD (objeto vacío) — admin/owner conservan mutación
    const role = (user as { role?: string }).role?.toLowerCase();
    if (
      (role === 'admin' || role === 'owner' || role === 'super_admin') &&
      (!permissions || Object.keys(permissions).length === 0)
    ) {
      return true;
    }

    throw new ForbiddenException(
      `No tienes permiso para ${meta.action} en el módulo ${meta.module}`,
    );
  }
}
