import { IsString, IsEmail, IsOptional } from 'class-validator';

export class CreateUserDto {
  @IsString()
  full_name: string;

  @IsEmail()
  email: string;

  @IsString()
  password: string;

  @IsString()
  companyId: string;

  @IsOptional()
  @IsString()
  role?: string = 'admin';
}
