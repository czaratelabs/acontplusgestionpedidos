import {
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
  UpdateEvent,
  RemoveEvent,
} from 'typeorm';
import { ClsService } from '../cls/cls-context.service';
import { Logger } from '@nestjs/common';

/**
 * Subscriber final ajustado a la tabla public.audit_logs
 * Resuelve errores de TypeScript y dependencias circulares.
 */
@EventSubscriber()
export class AuditSubscriber implements EntitySubscriberInterface {
  private readonly logger = new Logger(AuditSubscriber.name);

  constructor(private readonly clsService?: ClsService) {
    this.logger.log('✅ AuditSubscriber registrado y sincronizado con audit_logs');
  }

  private shouldAudit(entity: any): boolean {
    if (!entity || !entity.constructor || !entity.constructor.name) {
      return false;
    }

    const auditableEntities = [
      'Role',
      'Cliente',
      'Proveedor',
      'Configuracion',
      'Usuario',
      'Establecimiento',
      'PuntoEmision',
      'Bodega',
      'ReglaNegocio',
    ];

    return auditableEntities.includes(entity.constructor.name);
  }

  async afterInsert(event: InsertEvent<any>): Promise<void> {
    if (!event.entity || !this.shouldAudit(event.entity)) return;
    await this.createAuditLog(event, 'INSERT');
  }

  async afterUpdate(event: UpdateEvent<any>): Promise<void> {
    if (!event.entity || !this.shouldAudit(event.entity)) return;
    await this.createAuditLog(event, 'UPDATE');
  }

  async afterRemove(event: RemoveEvent<any>): Promise<void> {
    if (!event.entity || !this.shouldAudit(event.entity)) return;
    await this.createAuditLog(event, 'DELETE');
  }

  private async createAuditLog(
    event: InsertEvent<any> | UpdateEvent<any> | RemoveEvent<any>,
    action: 'INSERT' | 'UPDATE' | 'DELETE',
  ): Promise<void> {
    try {
      const userId = this.clsService?.getUserId?.();

      if (!userId || userId === 'system') {
        this.logger.warn(`⚠️ Auditoría sin usuario (Acción: ${action} en ${event.entity?.constructor?.name})`);
        // Si tu base de datos no permite NULL en performed_by, podrías retornar aquí.
      }

      const entityName = event.entity.constructor.name;
      const entityId = (event.entity as any).id || 'unknown';
      const companyId = (event.entity as any).companyId || null; // Captura company_id si existe en la entidad

      let oldValues: any = null;
      let newValues: any = null;

      if (action === 'INSERT') {
        newValues = event.entity;
      } else if (action === 'UPDATE') {
        const updateEvent = event as UpdateEvent<any>;
        oldValues = updateEvent.databaseEntity;
        newValues = updateEvent.entity;
      } else if (action === 'DELETE') {
        oldValues = event.entity;
      }

      // Inserción directa respetando los nombres de columna de tu tabla
      await event.manager.query(
        `
        INSERT INTO public.audit_logs (
          entity_name, 
          entity_id, 
          company_id, 
          action, 
          old_values, 
          new_values, 
          performed_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        `,
        [
          entityName,
          entityId.toString(),
          companyId,
          action,
          oldValues ? JSON.stringify(oldValues) : null,
          newValues ? JSON.stringify(newValues) : null,
          userId && userId !== 'system' ? userId : null, // realizado por (performed_by)
        ],
      );

      this.logger.debug(`✅ Auditoría guardada: ${action} en ${entityName}`);
    } catch (error) {
      this.logger.error(`❌ Error en AuditSubscriber: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}