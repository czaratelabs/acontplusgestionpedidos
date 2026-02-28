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

/** 5 tarifas fijas por variante. Rentabilidad se calcula en BD por trigger. */
export class CreateArticleVariantPriceDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  precioVenta1?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  precioVenta2?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  precioVenta3?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  precioVenta4?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  precioVenta5?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  pvp1?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  pvp2?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  pvp3?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  pvp4?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  pvp5?: number;

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
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  weight?: number;

  @IsOptional()
  @IsString()
  observations?: string | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateArticleVariantPriceDto)
  prices?: CreateArticleVariantPriceDto;
}

export class CreateArticleDto {
  /** Código maestro: único por empresa, agrupa todas las variantes. */
  @IsNotEmpty()
  @IsString()
  code: string;

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

  /** Variantes (SKU, precios, etc.). Opcional: se puede guardar solo la cabecera del artículo. */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateArticleVariantDto)
  variants?: CreateArticleVariantDto[];
}
