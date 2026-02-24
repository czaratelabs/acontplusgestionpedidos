import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ArticleVariant } from './article-variant.entity';

@Entity('article_batches')
export class ArticleVariantBatch {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'article_variant_id', type: 'uuid' })
  articleVariantId: string;

  @ManyToOne(() => ArticleVariant, (v) => v.batches, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'article_variant_id' })
  articleVariant: ArticleVariant;

  @Column({ name: 'batch_number', type: 'varchar', length: 100 })
  batchNumber: string;

  @Column({ name: 'expiration_date', type: 'date', nullable: true })
  expirationDate: Date | null;

  @Column({ name: 'current_stock', type: 'decimal', precision: 18, scale: 4, default: 0 })
  currentStock: number;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
}
