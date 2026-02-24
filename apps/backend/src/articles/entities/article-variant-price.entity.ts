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
import { Measure } from './measure.entity';

/** Price tier: PVP (retail), Wholesale, etc. */
@Entity('article_variant_prices')
export class ArticleVariantPrice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'article_variant_id', type: 'uuid' })
  articleVariantId: string;

  @ManyToOne(() => ArticleVariant, (v) => v.prices, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'article_variant_id' })
  variant: ArticleVariant;

  @Column({ name: 'price_type', type: 'varchar' }) // 'pvp', 'wholesale', 'promo', etc.
  priceType: string;

  @Column({ type: 'decimal', precision: 18, scale: 4 })
  price: number;

  @Column({ name: 'is_default', type: 'boolean', default: false })
  isDefault: boolean;

  @Column({ name: 'unit_id', type: 'uuid', nullable: true })
  unitId: string | null;

  @ManyToOne(() => Measure, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'unit_id' })
  unit: Measure | null;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
}
