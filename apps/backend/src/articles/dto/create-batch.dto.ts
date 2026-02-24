import { IsNotEmpty, IsString, IsOptional, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateBatchDto {
  @IsNotEmpty()
  @IsString()
  batchNumber: string;

  @IsOptional()
  expirationDate?: string | null; // ISO date string

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  currentStock?: number;
}
