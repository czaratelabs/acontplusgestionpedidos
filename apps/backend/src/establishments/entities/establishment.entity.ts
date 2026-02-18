import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Company } from '../../companies/entities/company.entity';
import { EmissionPoint } from '../../emission-points/entities/emission-point.entity';
import { Warehouse } from '../../warehouses/entities/warehouse.entity';

@Entity('establishments')
export class Establishment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string; 

  @Column()
  address: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  email: string;

  @Column({ length: 3, default: '001' })
  series: string; 

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;

  @Column({ nullable: true })
  logo_url: string;

  @ManyToOne(() => Company, (company) => company.establishments)
  company: Company;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany(() => EmissionPoint, (point) => point.establishment)
  emissionPoints: EmissionPoint[];

  @OneToMany(() => Warehouse, (warehouse) => warehouse.establishment)
  warehouses: Warehouse[];
}