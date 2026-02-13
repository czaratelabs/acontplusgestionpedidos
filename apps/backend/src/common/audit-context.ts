import { AsyncLocalStorage } from 'async_hooks';
import type { ClsService } from 'nestjs-cls';

export interface AuditUser {
  id: string;
}

export const auditUserStorage = new AsyncLocalStorage<AuditUser>();

export function getAuditUser(): AuditUser | undefined {
  return auditUserStorage.getStore();
}

/** Set from main.ts after app creation so TypeORM AuditSubscriber (no DI) can read request user from CLS. */
let clsServiceForAudit: ClsService | null = null;

export function setClsServiceForAudit(cls: ClsService): void {
  clsServiceForAudit = cls;
}

export function getClsServiceForAudit(): ClsService | null {
  return clsServiceForAudit;
}
