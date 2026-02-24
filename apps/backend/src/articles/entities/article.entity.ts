import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Company } from '../../companies/entities/company.entity';
import { Brand } from './brand.entity';
import { Category } from './category.entity';
import { Tax } from '../../taxes/entities/tax.entity';
import { ArticleVariant } from './article-variant.entity';
import { ArticleImage } from './article-image.entity';

/**
 * Article Header (Parent) - Shared metadata for retail, pharmacy, clothing.
 * Variants hold SKU, barcode, cost, stock, and attribute specifics.
 */
@Entity('articles')
export class Article {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ name: 'brand_id', type: 'uuid', nullable: true })
  brandId: string | null;

  @ManyToOne(() => Brand, (b) => b.articles, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'brand_id' })
  brand: Brand | null;

  @Column({ name: 'category_id', type: 'uuid', nullable: true })
  categoryId: string | null;

  @ManyToOne(() => Category, (c) => c.articles, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'category_id' })
  category: Category | null;

  @Column({ name: 'tax_id', type: 'uuid', nullable: true })
  taxId: string | null;

  @ManyToOne(() => Tax, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'tax_id' })
  tax: Tax | null;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'text', nullable: true })
  observations: string | null;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;

  @OneToMany(() => ArticleVariant, (v) => v.article, { cascade: true })
  variants: ArticleVariant[];

  @OneToMany(() => ArticleImage, (img) => img.article, { cascade: true })
  images: ArticleImage[];
}
