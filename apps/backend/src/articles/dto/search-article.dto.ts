import { IsOptional, IsString } from 'class-validator';

export class SearchArticleDto {
  @IsOptional()
  @IsString()
  q?: string; // barcode, sku, or name search

  @IsOptional()
  @IsString()
  companyId?: string;
}
