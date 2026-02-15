import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Company } from '../../companies/entities/company.entity';

/** SRI document type codes: C=Cédula, R=RUC, P=Pasaporte, F=Consumidor Final */
export const SRI_DOCUMENT_TYPE_CODES = ['C', 'R', 'P', 'F'] as const;
export type SriDocumentTypeCode = (typeof SRI_DOCUMENT_TYPE_CODES)[number];

@Entity('contacts')
export class Contact {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar', nullable: true })
  tradeName: string | null;

  /** SRI document type: C=Cédula, R=RUC, P=Pasaporte, F=Consumidor Final */
  @Column({ type: 'varchar', length: 1, default: 'R' })
  sriDocumentTypeCode: string;

  /** SRI tipo persona: 01=Persona natural, 02=Sociedad (nullable por datos existentes) */
  @Column({ type: 'varchar', length: 2, default: '01', nullable: true })
  sriPersonType: string | null;

  @Column({ type: 'varchar' })
  taxId: string;

  @Column({ type: 'varchar', nullable: true })
  email: string | null;

  @Column({ type: 'varchar', nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', nullable: true })
  address: string | null;

  @Column({ type: 'boolean', default: false })
  isClient: boolean;

  @Column({ type: 'boolean', default: false })
  isSupplier: boolean;

  @ManyToOne(() => Company, (company) => company.contacts)
  company: Company;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;

  /**
   * SRI (Ecuador) document type code by role.
   * C (Cédula): 02 (supplier) / 05 (client)
   * R (RUC): 01 (supplier) / 04 (client)
   * P (Pasaporte): 03 (supplier) / 06 (client)
   * F (Consumidor Final): 07 (client/supplier)
   */
  getSriCode(role: 'client' | 'supplier'): string {
    const map: Record<string, { client: string; supplier: string }> = {
      C: { client: '05', supplier: '02' },
      R: { client: '04', supplier: '01' },
      P: { client: '06', supplier: '03' },
      F: { client: '07', supplier: '07' },
    };
    return map[this.sriDocumentTypeCode]?.[role] ?? '04';
  }
}
