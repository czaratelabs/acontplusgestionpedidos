import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { ArticleVariant } from './article-variant.entity';

/**
 * Additional barcodes for a variant (e.g. different packaging or flavor).
 * The primary barcode remains on article_variants.barcode (Master Barcode).
 */
@Entity('article_variant_barcodes')
@Unique('UQ_article_variant_barcodes_barcode', ['barcode'])
@Index('IDX_article_variant_barcodes_variant', ['articleVariantId'])
export class ArticleVariantBarcode {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'article_variant_id', type: 'uuid' })
  articleVariantId: string;

  @ManyToOne(() => ArticleVariant, (v) => v.barcodes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'article_variant_id' })
  articleVariant: ArticleVariant;

  @Column({ type: 'varchar', length: 100 })
  barcode: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string | null;
}
