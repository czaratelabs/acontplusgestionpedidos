import { IsString, IsEmail, IsNotEmpty, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre de la empresa es requerido' })
  company_name: string;

  @IsString()
  @IsNotEmpty({ message: 'El RUC/NIT es requerido' })
  company_ruc_nit: string;

  @IsString()
  @IsNotEmpty({ message: 'Tu nombre completo es requerido' })
  full_name: string;

  @IsEmail({}, { message: 'Correo electrónico inválido' })
  email: string;

  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password: string;
}
