import {
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
  UpdateEvent,
} from 'typeorm';
import { SystemSetting } from '../system-settings/entities/system-setting.entity';
import { SYSTEM_TIMEZONE_KEY } from '../system-settings/entities/system-setting.entity';

const DEFAULT_TIMEZONE = 'America/Guayaquil';

const TRACKED_ENTITY_NAMES = [
  'Company',
  'Establishment',
  'EmissionPoint',
  'Warehouse',
  'User',
  'Tax',
  'Contact',
  'SystemSetting',
  'AuditLog',
];

function isTrackedEntity(entity: object): boolean {
  const name = (entity as { constructor?: { name?: string } }).constructor?.name;
  return !!name && TRACKED_ENTITY_NAMES.includes(name);
}

function hasTimestampColumns(entity: object): boolean {
  const e = entity as Record<string, unknown>;
  return 'created_at' in e || 'updated_at' in e;
}

function getCompanyIdFromEntry(entry: object | undefined): string | null {
  if (entry == null) return null;
  const e = entry as Record<string, unknown>;

  if (e.constructor?.name === 'Company' && e.id) return String(e.id);
  const company = e.company as { id?: string } | undefined;
  if (company?.id) return String(company.id);
  const establishment = e.establishment as { company?: { id?: string } } | undefined;
  if (establishment?.company?.id) return String(establishment.company.id);
  if (e.companyId != null) return String(e.companyId);
  if (e.company_id != null) return String(e.company_id);

  const keys = Object.keys(e);
  for (const key of keys) {
    if (key.toLowerCase().includes('company') && e[key] != null) {
      const value = e[key];
      if (typeof value === 'object' && value !== null && 'id' in value) {
        const id = (value as { id?: unknown }).id;
        if (id != null) return String(id);
      }
      if (typeof value === 'string' || typeof value === 'number') return String(value);
    }
  }
  return null;
}

async function getTimezoneForCompany(
  manager: import('typeorm').EntityManager,
  companyId: string | null,
): Promise<string> {
  if (!companyId) return DEFAULT_TIMEZONE;
  try {
    const setting = await manager.getRepository(SystemSetting).findOne({
      where: { companyId, key: SYSTEM_TIMEZONE_KEY },
    });
    return setting?.value?.trim() ?? DEFAULT_TIMEZONE;
  } catch (error) {
    // Si hay un error (por ejemplo, query runner liberado), usar timezone por defecto
    return DEFAULT_TIMEZONE;
  }
}

/** Valida y sanea el timezone para uso seguro en SET LOCAL (PostgreSQL no admite $1 en SET). */
function sanitizeTimezone(tz: string): string {
  const trimmed = tz.trim();
  if (!trimmed) return DEFAULT_TIMEZONE;
  if (!/^[a-zA-Z0-9/_+-]+$/.test(trimmed)) return DEFAULT_TIMEZONE;
  return trimmed;
}

@EventSubscriber()
export class TimestampSubscriber implements EntitySubscriberInterface {
  async beforeInsert(event: InsertEvent<object>): Promise<void> {
    const entity = event.entity as Record<string, unknown>;
    if (!entity || !isTrackedEntity(entity)) return;
    if (!hasTimestampColumns(entity)) return;

    const companyId = getCompanyIdFromEntry(entity);
    
    // Obtener el queryRunner del evento si está disponible
    const queryRunner = (event as any).queryRunner;
    const manager = queryRunner?.manager || event.manager;
    
    let timeZone: string;
    try {
      timeZone = sanitizeTimezone(await getTimezoneForCompany(manager, companyId));
    } catch (error) {
      // Si falla obtener el timezone, usar el por defecto
      timeZone = DEFAULT_TIMEZONE;
    }

    // Ejecutar SET LOCAL timezone usando el queryRunner si está disponible
    try {
      if (queryRunner && !queryRunner.isReleased) {
        await queryRunner.query(`SET LOCAL timezone = '${timeZone}'`);
      } else {
        // Fallback: usar manager directamente
        await event.manager.query(`SET LOCAL timezone = '${timeZone}'`);
      }
    } catch (error) {
      // Si falla establecer el timezone, continuar sin él
      // Los timestamps se guardarán con el timezone por defecto de la base de datos
    }
  }

  async beforeUpdate(event: UpdateEvent<object>): Promise<void> {
    const entity = event.entity as Record<string, unknown>;
    const dbEntity = event.databaseEntity as Record<string, unknown> | undefined;
    if (!entity || !isTrackedEntity(entity)) return;
    if (!hasTimestampColumns(entity)) return;

    const companyId = getCompanyIdFromEntry(entity) ?? getCompanyIdFromEntry(dbEntity);
    
    // Obtener el queryRunner del evento si está disponible
    const queryRunner = (event as any).queryRunner;
    const manager = queryRunner?.manager || event.manager;
    
    let timeZone: string;
    try {
      timeZone = sanitizeTimezone(await getTimezoneForCompany(manager, companyId));
    } catch (error) {
      // Si falla obtener el timezone, usar el por defecto
      timeZone = DEFAULT_TIMEZONE;
    }

    // Ejecutar SET LOCAL timezone usando el queryRunner si está disponible
    try {
      if (queryRunner && !queryRunner.isReleased) {
        await queryRunner.query(`SET LOCAL timezone = '${timeZone}'`);
      } else {
        // Fallback: usar manager directamente
        await event.manager.query(`SET LOCAL timezone = '${timeZone}'`);
      }
    } catch (error) {
      // Si falla establecer el timezone, continuar sin él
      // Los timestamps se guardarán con el timezone por defecto de la base de datos
    }
  }
}
