import { IsString, IsOptional, IsUUID } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateSettingDto {
  @IsUUID()
  companyId: string;

  @Transform(({ value }) => (value != null ? String(value) : value))
  @IsString()
  value: string;

  @IsOptional()
  @IsString()
  description?: string | null;
}
