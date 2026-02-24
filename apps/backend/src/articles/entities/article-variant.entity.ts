import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';
import { Article } from './article.entity';
import { ArticleVariantPrice } from './article-variant-price.entity';
import { ArticleVariantBatch } from './article-variant-batch.entity';
import { Measure } from './measure.entity';
import { Color } from './color.entity';
import { Size } from './size.entity';
import { Flavor } from './flavor.entity';

/**
 * Article Variant (Detail) - SKU, barcode, cost, stock, and attributes.
 * barcode and sku are unique per company_id.
 */
@Entity('article_variants')
@Unique('UQ_article_variants_company_sku', ['companyId', 'sku'])
@Index('IDX_article_variants_barcode')
@Index('IDX_article_variants_sku')
@Index('IDX_article_variants_company_id')
export class ArticleVariant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'article_id', type: 'uuid' })
  articleId: string;

  @ManyToOne(() => Article, (a) => a.variants, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'article_id' })
  article: Article;

  @Column({ type: 'varchar' })
  sku: string;

  @Column({ type: 'varchar', nullable: true })
  barcode: string | null;

  @Column({ type: 'decimal', precision: 18, scale: 4, default: 0 })
  cost: number;

  @Column({ name: 'color_id', type: 'uuid', nullable: true })
  colorId: string | null;

  @ManyToOne(() => Color, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'color_id' })
  color: Color | null;

  @Column({ name: 'size_id', type: 'uuid', nullable: true })
  sizeId: string | null;

  @ManyToOne(() => Size, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'size_id' })
  size: Size | null;

  @Column({ name: 'flavor_id', type: 'uuid', nullable: true })
  flavorId: string | null;

  @ManyToOne(() => Flavor, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'flavor_id' })
  flavor: Flavor | null;

  @Column({ type: 'varchar', nullable: true })
  measure: string | null;

  @Column({ name: 'measure_id', type: 'uuid', nullable: true })
  measureId: string | null;

  @ManyToOne(() => Measure, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'measure_id' })
  measureUnit: Measure | null;

  @Column({ name: 'stock_actual', type: 'decimal', precision: 18, scale: 4, default: 0 })
  stockActual: number;

  @Column({ name: 'stock_min', type: 'decimal', precision: 18, scale: 4, default: 0 })
  stockMin: number;

  /** Denormalized for unique constraints and fast lookups */
  @Column({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'text', nullable: true })
  observations: string | null;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;

  @OneToMany(() => ArticleVariantPrice, (p) => p.variant, { cascade: true })
  prices: ArticleVariantPrice[];

  @OneToMany(() => ArticleVariantBatch, (b) => b.articleVariant, { cascade: true })
  batches: ArticleVariantBatch[];
}
