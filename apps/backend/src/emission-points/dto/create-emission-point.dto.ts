import { IsNotEmpty, IsString, Length, IsInt, Min, IsOptional } from 'class-validator';

export class CreateEmissionPointDto {
  @IsNotEmpty()
  @IsString()
  @Length(3, 3)
  code: string; // Debe ser exactamente de 3 caracteres

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  invoice_sequence?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  proforma_sequence?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  order_sequence?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  delivery_note_sequence?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  dispatch_sequence?: number;
}