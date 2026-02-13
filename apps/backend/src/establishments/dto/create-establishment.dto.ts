import { IsNotEmpty, IsString, Length, IsOptional, IsEmail } from 'class-validator';

export class CreateEstablishmentDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  address: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsNotEmpty()
  @Length(3, 3)
  series: string;

  @IsOptional()
  @IsString()
  logo_url?: string;
}