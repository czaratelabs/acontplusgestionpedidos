import {
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
  UpdateEvent,
  RemoveEvent,
} from 'typeorm';
import { AuditLog, AuditAction } from './entities/audit-log.entity';
import { Company } from '../companies/entities/company.entity';
import { getClsServiceForAudit } from '../common/audit-context';
import { Establishment } from '../establishments/entities/establishment.entity';
import { EmissionPoint } from '../emission-points/entities/emission-point.entity';
import { Warehouse } from '../warehouses/entities/warehouse.entity';
import { User } from '../users/entities/user.entity';
import { Tax } from '../taxes/entities/tax.entity';

const ALLOWED_ENTITIES = [
  Company,
  Establishment,
  EmissionPoint,
  Warehouse,
  User,
  Tax,
];

function shouldAudit(entity: unknown): boolean {
  if (entity == null) return false;
  if (entity instanceof AuditLog) return false;
  return ALLOWED_ENTITIES.some((cls) => entity instanceof cls);
}

function getEntityName(entity: object): string {
  return entity.constructor.name;
}

/** Extract company ID from a single entity (relation object or column ID). */
function getCompanyIdFromEntry(entry: object | undefined): string | null {
  if (entry == null) return null;
  const e = entry as Record<string, unknown>;
  
  // If it's a Company entity itself, use its ID
  if (e.constructor?.name === 'Company' && e.id) return String(e.id);
  
  // Try relation object first (if loaded)
  const company = e.company as { id?: string } | undefined;
  if (company?.id) return String(company.id);
  
  // Try nested relation (e.g., EmissionPoint -> Establishment -> Company)
  const establishment = e.establishment as { company?: { id?: string } } | undefined;
  if (establishment?.company?.id) return String(establishment.company.id);
  
  // Try direct column IDs (TypeORM auto-creates companyId for @ManyToOne)
  // Check both camelCase and snake_case variants
  if (e.companyId != null && e.companyId !== undefined) return String(e.companyId);
  if (e.company_id != null && e.company_id !== undefined) return String(e.company_id);
  
  // Last resort: check all properties for company-related keys
  // TypeORM might store it under different property names
  const keys = Object.keys(e);
  for (const key of keys) {
    if (key.toLowerCase().includes('company') && e[key] != null) {
      const value = e[key];
      // If it's an object with id, extract it
      if (typeof value === 'object' && value !== null && 'id' in value) {
        const id = (value as { id?: unknown }).id;
        if (id != null) return String(id);
      }
      // If it's a direct ID value
      if (typeof value === 'string' || typeof value === 'number') {
        return String(value);
      }
    }
  }
  
  return null;
}

/**
 * Generic company preservation for audit logs.
 * Resolves company_id from updated entry first, then strictly falls back to original (database) entry.
 * Checks both relation (.company) and column (.companyId / .company_id) so company_id is never lost on UPDATE.
 */
function resolveCompanyIdForAudit(
  updatedEntry: object | undefined,
  originalEntry: object | undefined,
): string | null {
  // Try updated entry first
  let companyId = getCompanyIdFromEntry(updatedEntry);
  if (companyId) return companyId;
  
  // Strictly fallback to original (database) entry
  companyId = getCompanyIdFromEntry(originalEntry);
  return companyId ?? null;
}

function sanitize(obj: object | undefined): Record<string, unknown> | null {
  if (obj == null) return null;
  const raw = typeof obj === 'object' && !Array.isArray(obj) ? obj : {};
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (k === 'password_hash' || k === 'password') continue;
    if (typeof v === 'object' && v !== null && 'id' in (v as object)) {
      out[k] = { id: (v as { id: string }).id };
    } else {
      out[k] = v;
    }
  }
  return out;
}

/** User shape from CLS: JWT strategy sets { id, full_name, email }; middleware may set only { id }. */
function getPerformedBy(): string | null {
  const cls = getClsServiceForAudit();
  if (!cls) return null;
  const user = cls.get<{ id?: string } | undefined>('user');
  if (user?.id) return String(user.id);
  return null;
}

@EventSubscriber()
export class AuditSubscriber implements EntitySubscriberInterface {
  afterInsert(event: InsertEvent<object>): void {
    const entity = event.entity as Record<string, unknown>;
    if (!entity || !shouldAudit(entity)) return;
    const performedBy = getPerformedBy();
    const repo = event.manager.getRepository(AuditLog);
    const log = repo.create({
      entity_name: getEntityName(entity),
      entity_id: String(entity.id),
      company_id: getCompanyIdFromEntry(entity),
      action: AuditAction.CREATE,
      performed_by: performedBy,
      old_values: null,
      new_values: sanitize(entity),
    });
    repo.save(log).catch((err) => console.error('Audit afterInsert error', err));
  }

  afterUpdate(event: UpdateEvent<object>): void {
    const updatedEntry = event.entity as Record<string, unknown>;
    const originalEntry = event.databaseEntity as Record<string, unknown> | undefined;
    if (!updatedEntry || !shouldAudit(updatedEntry)) return;
    const performedBy = getPerformedBy();
    const repo = event.manager.getRepository(AuditLog);
    const companyId = resolveCompanyIdForAudit(updatedEntry, originalEntry);
    
    // Debug logging if companyId is missing
    if (!companyId) {
      const entityName = getEntityName(updatedEntry);
      console.warn(`[Audit] Missing company_id for ${entityName} update:`, {
        entityId: updatedEntry.id,
        updatedEntryKeys: Object.keys(updatedEntry),
        originalEntryKeys: originalEntry ? Object.keys(originalEntry) : [],
        updatedEntryCompany: (updatedEntry as any).company,
        originalEntryCompany: originalEntry ? (originalEntry as any).company : null,
      });
    }
    
    const log = repo.create({
      entity_name: getEntityName(updatedEntry),
      entity_id: String(updatedEntry.id),
      company_id: companyId,
      action: AuditAction.UPDATE,
      performed_by: performedBy,
      old_values: sanitize(originalEntry ?? {}),
      new_values: sanitize(updatedEntry),
    });
    repo.save(log).catch((err) => console.error('Audit afterUpdate error', err));
  }

  beforeRemove(event: RemoveEvent<object>): void {
    const entity = (event.databaseEntity ?? event.entity) as Record<string, unknown>;
    if (!entity || !shouldAudit(entity)) return;
    const performedBy = getPerformedBy();
    const repo = event.manager.getRepository(AuditLog);
    const log = repo.create({
      entity_name: getEntityName(entity),
      entity_id: String(entity.id),
      company_id: getCompanyIdFromEntry(entity),
      action: AuditAction.DELETE,
      performed_by: performedBy,
      old_values: sanitize(entity),
      new_values: null,
    });
    repo.save(log).catch((err) => console.error('Audit beforeRemove error', err));
  }
}
