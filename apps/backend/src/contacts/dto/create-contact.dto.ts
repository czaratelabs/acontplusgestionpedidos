import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsIn,
  Validate,
} from 'class-validator';
import { DocumentType, SriPersonType } from '../enums/document-type.enum';
import { TaxIdByDocumentTypeValidator } from './validate-tax-id-by-document';

export class CreateContactDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  tradeName?: string;

  @IsEnum(DocumentType, { message: 'Tipo de documento debe ser CEDULA, RUC o PASSPORT' })
  documentType: DocumentType;

  @IsNotEmpty({ message: 'Número de identificación es obligatorio' })
  @IsString()
  @Validate(TaxIdByDocumentTypeValidator)
  taxId: string;

  /** SRI tipo persona: 01 = Persona natural, 02 = Sociedad */
  @IsOptional()
  @IsIn(['01', '02'])
  sriPersonType?: SriPersonType;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsBoolean()
  isClient?: boolean;

  @IsOptional()
  @IsBoolean()
  isSupplier?: boolean;
}
