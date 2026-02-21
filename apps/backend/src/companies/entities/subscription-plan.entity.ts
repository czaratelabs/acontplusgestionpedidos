import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
} from 'typeorm';
import { Company } from './company.entity';

export interface PlanLimits {
  max_sellers?: number;
  max_establishments?: number;
  max_warehouses?: number;
  max_inventory_items?: number;
  storage_gb?: number;
  [key: string]: number | undefined;
}

export interface PlanModules {
  audit?: boolean;
  logistics?: boolean;
  business_rules?: boolean;
  sri?: boolean;
  [key: string]: boolean | undefined;
}

@Entity('subscription_plans')
export class SubscriptionPlan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  price: string;

  @Column({ name: 'implementation_fee', type: 'decimal', precision: 12, scale: 2, default: 0 })
  implementationFee: string;

  @Column({ type: 'jsonb', default: {} })
  limits: PlanLimits;

  @Column({ type: 'jsonb', default: {} })
  modules: PlanModules;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @OneToMany(() => Company, (company) => company.plan)
  companies: Company[];
}
