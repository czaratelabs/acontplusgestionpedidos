import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { Company } from '../companies/entities/company.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    
    // 👇 ESTO ERA LO QUE FALTABA: Inyectar la tabla de Empresas
    @InjectRepository(Company)
    private companyRepository: Repository<Company>,
  ) {}

  // Buscar por email (para Login)
  async findOneByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ 
      where: { email },
      relations: ['company'] 
    });
  }

  // Listar empleados de una empresa
  async findAllByCompany(companyId: string): Promise<User[]> {
    return this.userRepository.find({
      where: { company: { id: companyId } },
      select: ['id', 'full_name', 'email', 'role', 'created_at'],
      order: { created_at: 'DESC' }
    });
  }

  // Crear nuevo empleado
  async createEmployee(companyId: string, createUserDto: CreateUserDto): Promise<User> {
    // 1. Encriptar contraseña
    const salt = await bcrypt.genSalt();
    const password_hash = await bcrypt.hash(createUserDto.password, salt);

    // 2. Buscar la empresa (Ahora sí funcionará porque companyRepository existe)
    const company = await this.companyRepository.findOneBy({ id: companyId });
    if (!company) throw new Error('Company not found');

    // 3. Crear el usuario
    const newUser = this.userRepository.create({
      full_name: createUserDto.full_name,
      email: createUserDto.email,
      password_hash: password_hash,
      role: createUserDto.role,
      company: company,
    });

    return this.userRepository.save(newUser);
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.userRepository.findOneBy({ id });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    if (dto.full_name !== undefined) user.full_name = dto.full_name;
    if (dto.email !== undefined) user.email = dto.email;
    if (dto.role !== undefined) user.role = dto.role;

    if (dto.password !== undefined && dto.password !== null && String(dto.password).trim() !== '') {
      const salt = await bcrypt.genSalt();
      user.password_hash = await bcrypt.hash(dto.password.trim(), salt);
    }

    return this.userRepository.save(user);
  }
}