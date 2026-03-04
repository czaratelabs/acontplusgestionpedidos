import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsUUID,
} from 'class-validator';

/**
 * DTO para guardar únicamente los datos generales del artículo (pestaña General).
 * Excluye variantes y campos específicos de variante.
 * Validación estricta de campos obligatorios.
 */
export class SaveArticleGeneralDto {
  /** Categoría - Obligatorio */
  @IsNotEmpty({ message: 'La categoría es obligatoria' })
  @IsUUID()
  categoryId: string;

  /** Código maestro - Obligatorio. Único por empresa. */
  @IsNotEmpty({ message: 'El código maestro es obligatorio' })
  @IsString()
  code: string;

  /** Nombre base - Obligatorio */
  @IsNotEmpty({ message: 'El nombre base es obligatorio' })
  @IsString()
  name: string;

  /** IVA - Obligatorio */
  @IsNotEmpty({ message: 'El IVA es obligatorio' })
  @IsUUID()
  taxId: string;

  /** Marca - Opcional */
  @IsOptional()
  @IsUUID()
  brandId?: string | null;

  /** Observaciones - Opcional */
  @IsOptional()
  @IsString()
  observations?: string | null;
}
