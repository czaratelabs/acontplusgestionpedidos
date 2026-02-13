import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';

/** User fields safe to expose in audit log responses (no password_hash, etc.) */
export type AuditLogSafeUser = { id: string; full_name: string; email: string };

/** Audit log with performedByUser sanitized for API response */
export type AuditLogWithSafeUser = Omit<AuditLog, 'performedByUser'> & { performedByUser: AuditLogSafeUser | null };

export interface AuditLogsPagination {
  data: AuditLogWithSafeUser[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class AuditLogsService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepo: Repository<AuditLog>,
  ) {}

  async create(log: Partial<AuditLog>): Promise<AuditLog> {
    const entity = this.auditLogRepo.create(log);
    return this.auditLogRepo.save(entity);
  }

  async findAll(
    companyId: string | undefined,
    page = 1,
    limit = 20,
  ): Promise<{ data: AuditLogWithSafeUser[]; total: number }> {
    const where = companyId ? { company_id: companyId } : {};
    const [rows, total] = await this.auditLogRepo.findAndCount({
      where,
      relations: ['performedByUser'],
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    const data = rows.map((log): AuditLogWithSafeUser => {
      const { performedByUser, ...rest } = log;
      const safe: AuditLogWithSafeUser = { ...rest, performedByUser: null };
      safe.performedByUser = performedByUser
        ? { id: performedByUser.id, full_name: performedByUser.full_name, email: performedByUser.email }
        : null;
      return safe;
    });
    return { data, total };
  }

  async findAllByCompany(
    companyId: string,
    page = 1,
    limit = 20,
  ): Promise<AuditLogsPagination> {
    const { data, total } = await this.findAll(companyId, page, limit);
    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async findOne(id: string): Promise<AuditLog | null> {
    return this.auditLogRepo.findOne({ where: { id } });
  }
}
