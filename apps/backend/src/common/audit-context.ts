import { AsyncLocalStorage } from 'async_hooks';

export interface AuditUser {
  id: string;
}

export const auditUserStorage = new AsyncLocalStorage<AuditUser>();

export function getAuditUser(): AuditUser | undefined {
  return auditUserStorage.getStore();
}
