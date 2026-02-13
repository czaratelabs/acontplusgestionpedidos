import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
}

@Entity('audit_logs')
@Index(['entity_name', 'entity_id'])
@Index(['created_at'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', name: 'entity_name' })
  @Index()
  entity_name: string;

  @Column({ type: 'varchar', name: 'entity_id' })
  @Index()
  entity_id: string;

  @Column({ type: 'varchar', nullable: true, name: 'company_id' })
  @Index()
  company_id: string | null;

  @Column({ type: 'varchar', enum: AuditAction })
  action: AuditAction;

  @Column({ type: 'varchar', nullable: true, name: 'performed_by' })
  performed_by: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'performed_by' })
  performedByUser?: User | null;

  @Column({ type: 'jsonb', nullable: true, name: 'old_values' })
  old_values: Record<string, unknown> | null;

  @Column({ type: 'jsonb', nullable: true, name: 'new_values' })
  new_values: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  created_at: Date;
}
