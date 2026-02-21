import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';
import { CompaniesService } from '../../companies/companies.service';

const TYPE_TO_MODULE: Record<string, string> = {
  client: 'directory_clients',
  clients: 'directory_clients',
  supplier: 'directory_providers',
  providers: 'directory_providers',
  provider: 'directory_providers',
  employee: 'directory_employees',
  employees: 'directory_employees',
};

@Injectable()
export class ContactsModuleGuard implements CanActivate {
  constructor(private readonly companiesService: CompaniesService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as { role?: string; isSuperAdmin?: boolean } | undefined;
    if (user?.isSuperAdmin === true || user?.role?.toUpperCase() === 'SUPER_ADMIN') {
      return true;
    }
    let companyId = request.params?.companyId as string;
    if (!companyId?.trim()) {
      const resourceId = request.params?.id as string | undefined;
      if (resourceId?.trim()) {
        const resolved = await this.companiesService.getCompanyIdFromContactId(resourceId);
        if (resolved) companyId = resolved;
      }
    }
    if (!companyId?.trim()) return true;

    let modulesToCheck: string[] = [];
    if (request.method === 'GET') {
      const type = ((request.query?.type as string) ?? 'all').toLowerCase();
      modulesToCheck =
        type === 'all'
          ? ['directory_clients', 'directory_providers', 'directory_employees']
          : [TYPE_TO_MODULE[type] ?? 'directory_clients'];
    } else if (request.method === 'POST' && request.body) {
      const b = request.body as { isClient?: boolean; isSupplier?: boolean; isEmployee?: boolean };
      if (b.isClient) modulesToCheck.push('directory_clients');
      if (b.isSupplier) modulesToCheck.push('directory_providers');
      if (b.isEmployee) modulesToCheck.push('directory_employees');
      if (modulesToCheck.length === 0) modulesToCheck = ['directory_clients'];
    } else {
      modulesToCheck = ['directory_clients', 'directory_providers', 'directory_employees'];
    }

    for (const moduleKey of modulesToCheck) {
      const enabled = await this.companiesService.isModuleEnabled(
        companyId,
        moduleKey,
      );
      if (!enabled) {
        throw new ForbiddenException(
          'Tu plan no incluye este módulo del directorio. Contacta al administrador para actualizar tu suscripción.',
        );
      }
    }
    return true;
  }
}
