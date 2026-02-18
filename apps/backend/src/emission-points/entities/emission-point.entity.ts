import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Establishment } from '../../establishments/entities/establishment.entity';

@Entity('emission_points')
export class EmissionPoint {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 3 })
  code: string; // Ej: 001, 002 (Caja 1, Caja 2)

  @Column()
  name: string; // Ej: "Caja Principal"

  @Column({ default: 1 })
  invoice_sequence: number; // Factura

  @Column({ default: 1 })
  proforma_sequence: number; // Proforma

  @Column({ default: 1 })
  order_sequence: number; // Pedido

  @Column({ default: 1 })
  delivery_note_sequence: number; // Nota de Entrega

  @Column({ default: 1 })
  dispatch_sequence: number; // Despacho de Bodega

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;

  // Relación: Muchos puntos pertenecen a UN establecimiento
  @ManyToOne(() => Establishment, (establishment) => establishment.emissionPoints)
  establishment: Establishment;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}