import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { UserCompany } from './user-company.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  full_name: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password_hash: string;

  @Column({ default: true })
  is_active: boolean;

  @Column({ name: 'is_super_admin', default: false })
  is_super_admin: boolean;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @OneToMany(() => UserCompany, (uc) => uc.user)
  userCompanies: UserCompany[];
}
