import { IsString, IsOptional, IsUUID } from 'class-validator';

export class UpdateSettingDto {
  @IsUUID()
  companyId: string;

  @IsString()
  value: string;

  @IsOptional()
  @IsString()
  description?: string | null;
}
