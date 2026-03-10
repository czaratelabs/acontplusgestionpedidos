import { SetMetadata } from '@nestjs/common';

export const REQUIRE_PERMISSION_KEY = 'requirePermission';

export type RequirePermissionMeta = { module: string; action: string };

/**
 * Acción RBAC por módulo. El JWT debe incluir permissions con la forma:
 * - { "*": true } → super admin, todo permitido
 * - { inventory: true } → todo el módulo
 * - { inventory: { delete: true, edit: true } } → acciones puntuales
 */
export const RequirePermission = (module: string, action: string) =>
  SetMetadata(REQUIRE_PERMISSION_KEY, { module, action } as RequirePermissionMeta);
