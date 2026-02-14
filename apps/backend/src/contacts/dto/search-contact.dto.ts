import { IsOptional, IsString, IsIn, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export type ContactTypeFilter = 'client' | 'supplier' | 'all';

export class SearchContactDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  search?: string;

  @IsOptional()
  @IsIn(['client', 'supplier', 'all'])
  type?: ContactTypeFilter = 'all';
}
