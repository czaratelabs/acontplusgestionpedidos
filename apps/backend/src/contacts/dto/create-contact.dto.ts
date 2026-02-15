import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsBoolean,
  IsEmail,
  IsIn,
  Validate,
} from 'class-validator';
import { TaxIdByDocumentTypeValidator } from './validate-tax-id-by-document';

/** SRI document type codes: C=Cédula, R=RUC, P=Pasaporte, F=Consumidor Final */
export const SRI_DOCUMENT_TYPE_CODES = ['C', 'R', 'P', 'F'] as const;
export type SriDocumentTypeCode = (typeof SRI_DOCUMENT_TYPE_CODES)[number];

/** SRI person type: 01=Persona natural, 02=Sociedad */
export const SRI_PERSON_TYPES = ['01', '02'] as const;
export type SriPersonType = (typeof SRI_PERSON_TYPES)[number];

export class CreateContactDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  tradeName?: string;

  @IsNotEmpty({ message: 'Tipo de documento es obligatorio' })
  @IsIn(['C', 'R', 'P', 'F'], {
    message: 'Tipo de documento debe ser C (Cédula), R (RUC), P (Pasaporte) o F (Consumidor Final)',
  })
  sriDocumentTypeCode: SriDocumentTypeCode;

  @IsNotEmpty({ message: 'Tipo de persona es obligatorio' })
  @IsIn(['01', '02'], {
    message: 'Tipo de persona debe ser 01 (Persona natural) o 02 (Sociedad)',
  })
  sriPersonType: SriPersonType;

  @IsNotEmpty({ message: 'Número de identificación es obligatorio' })
  @IsString()
  @Validate(TaxIdByDocumentTypeValidator)
  taxId: string;

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
