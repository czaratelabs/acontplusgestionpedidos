import { IsOptional, IsString, IsIn, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { PaginationDto } from '../../common/dto/pagination.dto';

export type ContactTypeFilter = 'client' | 'supplier' | 'employee' | 'all';

export class SearchContactDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  search?: string;

  @IsOptional()
  @IsIn(['client', 'supplier', 'employee', 'all'])
  type?: ContactTypeFilter = 'all';
}
