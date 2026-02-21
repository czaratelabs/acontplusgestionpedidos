import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { CompaniesService } from '../../companies/companies.service';

export const MODULE_ENABLED_KEY = 'moduleEnabled';
export const MODULE_ENABLED_MSG_KEY = 'moduleEnabledMessage';

@Injectable()
export class ModuleEnabledGuard implements CanActivate {
  constructor(
    private readonly companiesService: CompaniesService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as { role?: string; isSuperAdmin?: boolean } | undefined;
    if (user?.isSuperAdmin === true || user?.role?.toUpperCase() === 'SUPER_ADMIN') {
      return true;
    }

    const moduleKey = this.reflector.getAllAndOverride<string>(
      MODULE_ENABLED_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!moduleKey) return true;

    let companyId =
      (request.query.companyId as string) ??
      (request.params?.companyId as string) ??
      ((request.body as { companyId?: string })?.companyId as string);

    // For routes like PATCH/DELETE /establishments/:id, params.id is the establishment id,
    // not the company id. Resolve companyId from the establishment.
    const resourceId = request.params?.id as string | undefined;
    if (!companyId?.trim() && resourceId?.trim()) {
      const path = (request.path ?? request.url ?? '').toLowerCase();
      if (path.includes('/establishments/')) {
        const resolved = await this.companiesService.getCompanyIdFromEstablishmentId(resourceId);
        if (resolved) companyId = resolved;
      } else if (path.includes('/warehouses/')) {
        const resolved = await this.companiesService.getCompanyIdFromWarehouseId(resourceId);
        if (resolved) companyId = resolved;
      } else {
        companyId = resourceId; // e.g. /companies/:id - params.id is companyId
      }
    }

    if (!companyId?.trim()) return true;

    const enabled = await this.companiesService.isModuleEnabled(
      companyId,
      moduleKey,
    );
    if (!enabled) {
      const customMsg = this.reflector.getAllAndOverride<string>(
        MODULE_ENABLED_MSG_KEY,
        [context.getHandler(), context.getClass()],
      );
      throw new ForbiddenException(
        customMsg ?? 'Tu plan no incluye este módulo. Contacta al administrador para actualizar tu suscripción.',
      );
    }
    return true;
  }
}
