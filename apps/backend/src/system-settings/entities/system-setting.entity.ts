import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { Company } from '../../companies/entities/company.entity';

export const SYSTEM_TIMEZONE_KEY = 'SYSTEM_TIMEZONE';
export const SYSTEM_CURRENCY_KEY = 'SYSTEM_CURRENCY';
export const SYSTEM_DATE_FORMAT_KEY = 'SYSTEM_DATE_FORMAT';

@Entity('system_settings')
@Unique(['company', 'key'])
export class SystemSetting {
  @PrimaryColumn({ type: 'uuid', name: 'company_id' })
  companyId: string;

  @PrimaryColumn({ type: 'varchar', name: 'key' })
  key: string;

  @ManyToOne(() => Company, (company) => company.settings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Column({ type: 'text', name: 'value' })
  value: string;

  @Column({ type: 'varchar', nullable: true, name: 'description' })
  description: string | null;
}
