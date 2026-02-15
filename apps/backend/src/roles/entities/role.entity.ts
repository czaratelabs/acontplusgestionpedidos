import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Company } from '../../companies/entities/company.entity';

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar', nullable: true })
  description: string | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'company_id', type: 'uuid', nullable: true })
  companyId: string | null;

  @ManyToOne(() => Company, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'company_id' })
  company: Company | null;
}
