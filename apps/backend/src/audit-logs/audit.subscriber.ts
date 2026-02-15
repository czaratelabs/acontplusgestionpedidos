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
import { Contact } from '../contacts/entities/contact.entity';
import { UserCompany } from '../users/entities/user-company.entity';
import { Role } from '../roles/entities/role.entity';
import {
  SystemSetting,
  SYSTEM_TIMEZONE_KEY,
} from '../system-settings/entities/system-setting.entity';

const ALLOWED_ENTITIES = [
  Company,
  Establishment,
  EmissionPoint,
  Warehouse,
  User,
  UserCompany,
  Role,
  Tax,
  Contact,
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

/**
 * Format a Date to local time string in the given IANA timezone,
 * matching standard DB columns (e.g. '2023-10-01 15:00:00').
 */
function toLocalDateString(date: Date, timeZone: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).formatToParts(date);
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
    return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}:${get('second')}`;
  } catch {
    return date.toISOString().replace('T', ' ').slice(0, 19);
  }
}

function serializeValueWithTimezone(v: unknown, timeZone: string): unknown {
  if (v instanceof Date) return toLocalDateString(v, timeZone);
  if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
    if ('id' in (v as object) && Object.keys(v as object).length === 1) return v;
    return serializeDatesWithTimezone(v as Record<string, unknown>, timeZone);
  }
  if (Array.isArray(v)) {
    return v.map((item) => serializeValueWithTimezone(item, timeZone));
  }
  return v;
}

/**
 * Recursively replace Date values with local time strings in the given timezone.
 */
function serializeDatesWithTimezone(
  obj: Record<string, unknown> | null,
  timeZone: string,
): Record<string, unknown> | null {
  if (obj == null) return null;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = serializeValueWithTimezone(v, timeZone);
  }
  return out;
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

function getTimezoneFromDb(
  manager: import('typeorm').EntityManager,
  companyId: string | null,
): Promise<string> {
  if (!companyId) return Promise.resolve('UTC');
  return manager
    .getRepository(SystemSetting)
    .findOne({ where: { companyId, key: SYSTEM_TIMEZONE_KEY } })
    .then((s) => s?.value?.trim() ?? 'UTC');
}

@EventSubscriber()
export class AuditSubscriber implements EntitySubscriberInterface {
  afterInsert(event: InsertEvent<object>): void {
    const entity = event.entity as Record<string, unknown>;
    if (!entity || !shouldAudit(entity)) return;
    const companyId = getCompanyIdFromEntry(entity);
    const performedBy = getPerformedBy();
    const repo = event.manager.getRepository(AuditLog);
    getTimezoneFromDb(event.manager, companyId)
      .then((timeZone) => {
        const log = repo.create({
          entity_name: getEntityName(entity),
          entity_id: String(entity.id),
          company_id: companyId,
          action: AuditAction.CREATE,
          performed_by: performedBy,
          old_values: null,
          new_values: serializeDatesWithTimezone(sanitize(entity), timeZone),
        });
        return repo.save(log);
      })
      .catch((err) => console.error('Audit afterInsert error', err));
  }

  afterUpdate(event: UpdateEvent<object>): void {
    const updatedEntry = event.entity as Record<string, unknown>;
    const originalEntry = event.databaseEntity as Record<string, unknown> | undefined;
    if (!updatedEntry || !shouldAudit(updatedEntry)) return;
    const performedBy = getPerformedBy();
    const repo = event.manager.getRepository(AuditLog);
    const companyId = resolveCompanyIdForAudit(updatedEntry, originalEntry);

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

    getTimezoneFromDb(event.manager, companyId)
      .then((timeZone) => {
        const log = repo.create({
          entity_name: getEntityName(updatedEntry),
          entity_id: String(updatedEntry.id),
          company_id: companyId,
          action: AuditAction.UPDATE,
          performed_by: performedBy,
          old_values: serializeDatesWithTimezone(sanitize(originalEntry ?? {}), timeZone),
          new_values: serializeDatesWithTimezone(sanitize(updatedEntry), timeZone),
        });
        return repo.save(log);
      })
      .catch((err) => console.error('Audit afterUpdate error', err));
  }

  beforeRemove(event: RemoveEvent<object>): void {
    const entity = (event.databaseEntity ?? event.entity) as Record<string, unknown>;
    if (!entity || !shouldAudit(entity)) return;
    const companyId = getCompanyIdFromEntry(entity);
    const performedBy = getPerformedBy();
    const repo = event.manager.getRepository(AuditLog);
    getTimezoneFromDb(event.manager, companyId)
      .then((timeZone) => {
        const log = repo.create({
          entity_name: getEntityName(entity),
          entity_id: String(entity.id),
          company_id: companyId,
          action: AuditAction.DELETE,
          performed_by: performedBy,
          old_values: serializeDatesWithTimezone(sanitize(entity), timeZone),
          new_values: null,
        });
        return repo.save(log);
      })
      .catch((err) => console.error('Audit beforeRemove error', err));
  }
}
