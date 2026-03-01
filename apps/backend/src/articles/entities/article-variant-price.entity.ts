import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ArticleVariant } from './article-variant.entity';

/**
 * Precios por variante: 5 tarifas fijas (precio_venta, pvp, rentabilidad).
 * rentabilidad1-5 son calculados por trigger en BD; no se escriben desde la app.
 */
@Entity('article_variant_prices')
export class ArticleVariantPrice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'article_variant_id', type: 'uuid', unique: true })
  articleVariantId: string;

  @ManyToOne(() => ArticleVariant, (v) => v.prices, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'article_variant_id' })
  variant: ArticleVariant;

  // Tarifas de venta (neto)
  @Column({ name: 'precio_venta1', type: 'decimal', precision: 18, scale: 4, default: 0 })
  precioVenta1: number;

  @Column({ name: 'precio_venta2', type: 'decimal', precision: 18, scale: 4, default: 0 })
  precioVenta2: number;

  @Column({ name: 'precio_venta3', type: 'decimal', precision: 18, scale: 4, default: 0 })
  precioVenta3: number;

  @Column({ name: 'precio_venta4', type: 'decimal', precision: 18, scale: 4, default: 0 })
  precioVenta4: number;

  @Column({ name: 'precio_venta5', type: 'decimal', precision: 18, scale: 4, default: 0 })
  precioVenta5: number;

  // PVP (etiqueta / público sugerido)
  @Column({ name: 'pvp1', type: 'decimal', precision: 18, scale: 4, default: 0 })
  pvp1: number;

  @Column({ name: 'pvp2', type: 'decimal', precision: 18, scale: 4, default: 0 })
  pvp2: number;

  @Column({ name: 'pvp3', type: 'decimal', precision: 18, scale: 4, default: 0 })
  pvp3: number;

  @Column({ name: 'pvp4', type: 'decimal', precision: 18, scale: 4, default: 0 })
  pvp4: number;

  @Column({ name: 'pvp5', type: 'decimal', precision: 18, scale: 4, default: 0 })
  pvp5: number;

  // Rentabilidad: calculada por trigger (precio_venta - cost). Solo lectura en app.
  @Column({ name: 'rentabilidad1', type: 'decimal', precision: 18, scale: 2, default: 0, insert: false, update: false })
  rentabilidad1: number;

  @Column({ name: 'rentabilidad2', type: 'decimal', precision: 18, scale: 2, default: 0, insert: false, update: false })
  rentabilidad2: number;

  @Column({ name: 'rentabilidad3', type: 'decimal', precision: 18, scale: 2, default: 0, insert: false, update: false })
  rentabilidad3: number;

  @Column({ name: 'rentabilidad4', type: 'decimal', precision: 18, scale: 2, default: 0, insert: false, update: false })
  rentabilidad4: number;

  @Column({ name: 'rentabilidad5', type: 'decimal', precision: 18, scale: 2, default: 0, insert: false, update: false })
  rentabilidad5: number;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
}
