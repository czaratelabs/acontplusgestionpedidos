import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsUUID,
  IsArray,
  ValidateNested,
  IsNumber,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateArticleVariantPriceDto {
  @IsString()
  priceType: string;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  price: number;

  @IsOptional()
  isDefault?: boolean;

  @IsOptional()
  @IsUUID()
  unitId?: string | null;
}

export class CreateArticleVariantDto {
  @IsNotEmpty()
  @IsString()
  sku: string;

  @IsOptional()
  @IsString()
  barcode?: string | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  cost?: number;

  @IsOptional()
  @IsUUID()
  colorId?: string | null;

  @IsOptional()
  @IsUUID()
  sizeId?: string | null;

  @IsOptional()
  @IsUUID()
  flavorId?: string | null;

  @IsOptional()
  @IsString()
  measure?: string | null;

  @IsOptional()
  @IsUUID()
  measureId?: string | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  stockActual?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  stockMin?: number;

  @IsOptional()
  @IsString()
  observations?: string | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateArticleVariantPriceDto)
  prices?: CreateArticleVariantPriceDto[];
}

export class CreateArticleDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsUUID()
  brandId?: string | null;

  @IsOptional()
  @IsUUID()
  categoryId?: string | null;

  @IsOptional()
  @IsUUID()
  taxId?: string | null;

  @IsOptional()
  @IsString()
  observations?: string | null;

  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateArticleVariantDto)
  variants: CreateArticleVariantDto[];
}
