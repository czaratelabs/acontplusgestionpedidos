import {
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
  UpdateEvent,
  RemoveEvent,
} from 'typeorm';
import { AuditLog, AuditAction } from './entities/audit-log.entity';
import { getAuditUser } from '../common/audit-context';
import { Company } from '../companies/entities/company.entity';
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

function getCompanyId(entity: object): string | null {
  const e = entity as any;
  if (entity.constructor.name === 'Company' && e.id) return String(e.id);
  if (e.company?.id) return String(e.company.id);
  if (e.establishment?.company?.id) return String(e.establishment.company.id);
  if (e.companyId) return String(e.companyId);
  return null;
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

@EventSubscriber()
export class AuditSubscriber implements EntitySubscriberInterface {
  afterInsert(event: InsertEvent<object>): void {
    const entity = event.entity as any;
    if (!entity || !shouldAudit(entity)) return;
    const user = getAuditUser();
    const repo = event.manager.getRepository(AuditLog);
    const log = repo.create({
      entity_name: getEntityName(entity),
      entity_id: String(entity.id),
      company_id: getCompanyId(entity),
      action: AuditAction.CREATE,
      performed_by: user?.id ?? null,
      old_values: null,
      new_values: sanitize(entity),
    });
    repo.save(log).catch((err) => console.error('Audit afterInsert error', err));
  }

  beforeUpdate(event: UpdateEvent<object>): void {
    const entity = event.entity as any;
    if (!entity || !shouldAudit(entity)) return;
    const databaseEntity = event.databaseEntity as any;
    const user = getAuditUser();
    const repo = event.manager.getRepository(AuditLog);
    const log = repo.create({
      entity_name: getEntityName(entity),
      entity_id: String(entity.id),
      company_id: getCompanyId(entity),
      action: AuditAction.UPDATE,
      performed_by: user?.id ?? null,
      old_values: sanitize(databaseEntity),
      new_values: sanitize(entity),
    });
    repo.save(log).catch((err) => console.error('Audit beforeUpdate error', err));
  }

  beforeRemove(event: RemoveEvent<object>): void {
    const entity = (event.databaseEntity ?? event.entity) as any;
    if (!entity || !shouldAudit(entity)) return;
    const user = getAuditUser();
    const repo = event.manager.getRepository(AuditLog);
    const log = repo.create({
      entity_name: getEntityName(entity),
      entity_id: String(entity.id),
      company_id: getCompanyId(entity),
      action: AuditAction.DELETE,
      performed_by: user?.id ?? null,
      old_values: sanitize(entity),
      new_values: null,
    });
    repo.save(log).catch((err) => console.error('Audit beforeRemove error', err));
  }
}
