import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';

import { Establishment } from '../../establishments/entities/establishment.entity';
import { Tax } from '../../taxes/entities/tax.entity';
import { Contact } from '../../contacts/entities/contact.entity';

@Entity('companies')
export class Company {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar', unique: true })
  ruc_nit: string;

  @Column({ type: 'varchar', nullable: true })
  address: string | null;

  @Column({ type: 'varchar', nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', nullable: true })
  email: string | null;

  @Column({ type: 'varchar', nullable: true })
  logo_url: string | null;

  @Column({ default: true })
  is_active: boolean;

  @Column({ type: 'int', default: 2 })
  decimal_precision: number;

  @Column({ type: 'boolean', default: false })
  prevent_negative_stock: boolean;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;

  @OneToMany(() => Establishment, (establishment) => establishment.company)
  establishments: Establishment[];

  @OneToMany(() => Tax, (tax) => tax.company)
  taxes: Tax[];

  @OneToMany(() => Contact, (contact) => contact.company)
  contacts: Contact[];
}