import { IsString, IsOptional, IsBoolean, IsObject, MinLength } from 'class-validator';

export class CreateRoleDto {
  @IsString()
  @MinLength(1, { message: 'El nombre del rol es requerido' })
  name: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  companyId?: string | null;

  @IsOptional()
  @IsObject()
  permissions?: Record<string, unknown>;
}
