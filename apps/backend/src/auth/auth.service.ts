import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { CompaniesService } from '../companies/companies.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private companiesService: CompaniesService,
    private jwtService: JwtService,
  ) {}

  async signIn(email: string, pass: string): Promise<any> {
    // 1. Buscamos al usuario por email
    const user = await this.usersService.findOneByEmail(email);
    
    // Si no existe el usuario, lanzamos error
    if (!user) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    // 2. 🔐 VERIFICACIÓN REAL: Comparamos la contraseña plana con el Hash
    const isMatch = await bcrypt.compare(pass, user.password_hash);

    // Si la contraseña no coincide...
    if (!isMatch) {
      // (Opcional) Si tu usuario Admin original NO tiene hash, esto es un salvavidas temporal:
      if (user.password_hash === pass) {
         // Esto permite entrar si la contraseña NO estaba encriptada (Legacy)
      } else {
         throw new UnauthorizedException('Credenciales incorrectas');
      }
    }

    // 3. Generamos el Token con los datos correctos
    const payload = { sub: user.id, username: user.email, role: user.role };
    
    return {
      access_token: await this.jwtService.signAsync(payload),
      user: {
        id: user.id,
        name: user.full_name,
        email: user.email,
        role: user.role,
        companyId: user.company.id
      }
    };
  }

  async register(dto: RegisterDto): Promise<{ message: string; companyId: string }> {
    const existingUser = await this.usersService.findOneByEmail(dto.email);
    if (existingUser) {
      throw new ConflictException('Ya existe una cuenta con este correo electrónico');
    }

    const company = await this.companiesService.create({
      name: dto.company_name,
      ruc_nit: dto.company_ruc_nit,
    });

    await this.usersService.createEmployee(company.id, {
      full_name: dto.full_name,
      email: dto.email,
      password: dto.password,
      role: 'admin',
    });

    return {
      message: 'Cuenta creada correctamente. Ya puedes iniciar sesión.',
      companyId: company.id,
    };
  }
}