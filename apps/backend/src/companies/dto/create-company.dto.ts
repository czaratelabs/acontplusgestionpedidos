import { IsNotEmpty, IsString, IsOptional, IsEmail, IsInt, Min, Max, IsBoolean } from 'class-validator';

export class CreateCompanyDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  ruc_nit: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  logo_url?: string;

  @IsOptional()
  @IsInt()
  @Min(2)
  @Max(4)
  decimal_precision?: number;

  @IsOptional()
  @IsBoolean()
  prevent_negative_stock?: boolean;
}
