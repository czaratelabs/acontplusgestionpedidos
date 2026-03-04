import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Company } from '../../companies/entities/company.entity';
import { Article } from './article.entity';

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  name: string;

  /** Siglas generadas del nombre: 1 palabra → 3 letras; 2+ palabras → 2 letras primera + 1 por resto. En mayúsculas. */
  @Column({ type: 'varchar', length: 20, default: '' })
  siglas: string;

  /** Secuencial que incrementa al crear un artículo en esta categoría. Usado para código maestro. Editable. */
  @Column({ type: 'int', default: 1 })
  secuencial: number;

  /** Secuencial que incrementa al crear una variante. Usado para SKU y código de barras. */
  @Column({ name: 'secuencial_variantes', type: 'int', default: 1 })
  secuencialVariantes: number;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;

  @OneToMany(() => Article, (a) => a.category)
  articles: Article[];
}
