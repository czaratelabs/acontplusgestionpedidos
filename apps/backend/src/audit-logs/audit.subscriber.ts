import { Injectable, Logger } from '@nestjs/common';
import {
  DataSource,
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
  UpdateEvent,
  RemoveEvent,
} from 'typeorm';
import { AuditLog, AuditAction } from './entities/audit-log.entity';
import { Company } from '../companies/entities/company.entity';
import { auditUserStorage } from '../common/audit-context';
import { Establishment } from '../establishments/entities/establishment.entity';
import { EmissionPoint } from '../emission-points/entities/emission-point.entity';
import { Warehouse } from '../warehouses/entities/warehouse.entity';
import { User } from '../users/entities/user.entity';
import { Tax } from '../taxes/entities/tax.entity';
import { Contact } from '../contacts/entities/contact.entity';
import { UserCompany } from '../users/entities/user-company.entity';
import { Role } from '../roles/entities/role.entity';
import { BusinessRule } from '../business-rules/entities/business-rule.entity';
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
  BusinessRule,
  Tax,
  Contact,
  SystemSetting,
];

function shouldAudit(entity: unknown): boolean {
  if (entity == null) {
    return false;
  }
  
  // Skip AuditLog entities to prevent infinite loops
  const entityName = (entity as any)?.constructor?.name;
  if (entityName === 'AuditLog') {
    return false;
  }
  
  // Check using instanceof (works for direct instances)
  let result = ALLOWED_ENTITIES.some((cls) => entity instanceof cls);
  
  // Fallback: check by constructor name if instanceof fails
  // This handles cases where TypeORM creates proxies or different instances
  if (!result && entityName) {
    const allowedNames = ALLOWED_ENTITIES.map(c => c.name);
    result = allowedNames.includes(entityName);
  }
  
  return result;
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
    // Skip sensitive fields
    if (k === 'password_hash' || k === 'password') continue;
    // Skip timestamp fields that change on every update (not meaningful for audit diff)
    if (k === 'updated_at' || k === 'updatedAt') continue;
    // Serialize relations to just their ID
    if (typeof v === 'object' && v !== null && 'id' in (v as object)) {
      out[k] = { id: (v as { id: string }).id };
    } else {
      out[k] = v;
    }
  }
  return out;
}

/**
 * Compare two objects and return only the fields that changed.
 * Returns an object with only the changed fields from newObj.
 */
function getChangedFields(
  oldObj: Record<string, unknown> | null,
  newObj: Record<string, unknown> | null,
): Record<string, unknown> | null {
  if (newObj == null) return null;
  if (oldObj == null) return newObj;

  const changed: Record<string, unknown> = {};
  const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);

  for (const key of allKeys) {
    // Skip timestamp fields
    if (key === 'updated_at' || key === 'updatedAt' || key === 'created_at' || key === 'createdAt') {
      continue;
    }

    const oldVal = oldObj[key];
    const newVal = newObj[key];

    // Deep comparison for objects/arrays
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changed[key] = newVal;
    }
  }

  return Object.keys(changed).length > 0 ? changed : null;
}

/**
 * Get the current user ID from auditUserStorage (AsyncLocalStorage nativo).
 * Más confiable que nestjs-cls en contextos TypeORM fuera del DI de NestJS.
 */
function getPerformedBy(logger: Logger): string | null {
  const user = auditUserStorage.getStore();

  if (!user) {
    return null;
  }

  if (!user.id) {
    logger.warn('[Audit] User in auditUserStorage missing id field:', user);
    return null;
  }

  return String(user.id);
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

@Injectable()
@EventSubscriber()
export class AuditSubscriber implements EntitySubscriberInterface {
  private readonly logger = new Logger(AuditSubscriber.name);

  constructor(private readonly dataSource: DataSource) {}

  afterInsert(event: InsertEvent<object>): void {
    const entity = event.entity as Record<string, unknown>;
    
    if (!entity || !shouldAudit(entity)) {
      return;
    }
    
    const companyId = getCompanyIdFromEntry(entity);
    const performedBy = getPerformedBy(this.logger);
    
    this.logger.debug(
      `Creating audit log for INSERT: ${getEntityName(entity)} (id: ${entity.id}, companyId: ${companyId})`
    );
    
    getTimezoneFromDb(this.dataSource.manager, companyId)
      .then((timeZone) => {
        const repo = this.dataSource.manager.getRepository(AuditLog);
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
      .then((savedLog) => {
        this.logger.debug(`Audit log saved successfully: ${savedLog.id}`);
      })
      .catch((err) => {
        this.logger.error(
          `Error creating audit log for INSERT: ${getEntityName(entity)} (id: ${entity.id})`,
          err?.stack || err
        );
      });
  }

  afterUpdate(event: UpdateEvent<object>): void {
    const updatedEntry = event.entity as Record<string, unknown>;
    const originalEntry = event.databaseEntity as Record<string, unknown> | undefined;
    if (!updatedEntry || !shouldAudit(updatedEntry)) return;
    const performedBy = getPerformedBy(this.logger);
    const companyId = resolveCompanyIdForAudit(updatedEntry, originalEntry);

    if (!companyId) {
      const entityName = getEntityName(updatedEntry);
      this.logger.warn(
        `Missing company_id for ${entityName} update (id: ${updatedEntry.id})`
      );
    }

    getTimezoneFromDb(this.dataSource.manager, companyId)
      .then((timeZone) => {
        // Sanitize both entries (removes passwords, timestamps, serializes relations)
        const sanitizedOld = serializeDatesWithTimezone(sanitize(originalEntry ?? {}), timeZone);
        const sanitizedNew = serializeDatesWithTimezone(sanitize(updatedEntry), timeZone);

        // Only save fields that actually changed (diff comparison)
        const changedFields = getChangedFields(sanitizedOld, sanitizedNew);

        // If nothing changed (only timestamps), skip audit log
        if (!changedFields || Object.keys(changedFields).length === 0) {
          return;
        }

        // Build old_values with only the changed fields from original
        const oldValues: Record<string, unknown> = {};
        if (sanitizedOld) {
          for (const key of Object.keys(changedFields)) {
            if (key in sanitizedOld) {
              oldValues[key] = sanitizedOld[key];
            }
          }
        }

        const repo = this.dataSource.manager.getRepository(AuditLog);
        const log = repo.create({
          entity_name: getEntityName(updatedEntry),
          entity_id: String(updatedEntry.id),
          company_id: companyId,
          action: AuditAction.UPDATE,
          performed_by: performedBy,
          old_values: Object.keys(oldValues).length > 0 ? oldValues : null,
          new_values: changedFields,
        });
        return repo.save(log);
      })
      .catch((err) => {
        this.logger.error(
          `Error creating audit log for UPDATE: ${getEntityName(updatedEntry)} (id: ${updatedEntry.id})`,
          err?.stack || err
        );
      });
  }

  beforeRemove(event: RemoveEvent<object>): void {
    const entity = (event.databaseEntity ?? event.entity) as Record<string, unknown>;
    if (!entity || !shouldAudit(entity)) return;
    const companyId = getCompanyIdFromEntry(entity);
    const performedBy = getPerformedBy(this.logger);
    getTimezoneFromDb(this.dataSource.manager, companyId)
      .then((timeZone) => {
        const repo = this.dataSource.manager.getRepository(AuditLog);
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
      .catch((err) => {
        this.logger.error(
          `Error creating audit log for DELETE: ${getEntityName(entity)} (id: ${entity.id})`,
          err?.stack || err
        );
      });
  }
}
