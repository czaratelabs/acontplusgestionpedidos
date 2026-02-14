import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Company } from '../../companies/entities/company.entity';
import { DocumentType } from '../enums/document-type.enum';

@Entity('contacts')
export class Contact {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar', nullable: true })
  tradeName: string | null;

  @Column({
    type: 'enum',
    enum: DocumentType,
    default: DocumentType.RUC,
  })
  documentType: DocumentType;

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

  /** SRI code for document type: C=Cédula, R=RUC, P=Pasaporte, F=Consumidor Final */
  @Column({ type: 'varchar', length: 1, default: 'R' })
  sriDocumentTypeCode: string;

  /** SRI tipo persona: 01=Persona natural, 02=Sociedad */
  @Column({ type: 'varchar', length: 2, nullable: true })
  sriPersonType: string | null;

  @ManyToOne(() => Company, (company) => company.contacts)
  company: Company;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;

  /**
   * SRI (Ecuador) document type code by role.
   * CEDULA: 02 (supplier) / 05 (client)
   * RUC: 01 (supplier) / 04 (client)
   * PASSPORT: 03 (supplier) / 06 (client)
   * CONSUMIDOR_FINAL: 07 (client)
   */
  getSriCode(role: 'client' | 'supplier'): string {
    const map: Record<DocumentType, { client: string; supplier: string }> = {
      [DocumentType.CEDULA]: { client: '05', supplier: '02' },
      [DocumentType.RUC]: { client: '04', supplier: '01' },
      [DocumentType.PASSPORT]: { client: '06', supplier: '03' },
      [DocumentType.CONSUMIDOR_FINAL]: { client: '07', supplier: '07' },
    };
    return map[this.documentType]?.[role] ?? '04';
  }
}
