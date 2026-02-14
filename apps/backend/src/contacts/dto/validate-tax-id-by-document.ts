import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { DocumentType, CONSUMIDOR_FINAL_TAX_ID } from '../enums/document-type.enum';

@ValidatorConstraint({ name: 'TaxIdByDocumentType', async: false })
export class TaxIdByDocumentTypeValidator implements ValidatorConstraintInterface {
  validate(taxId: string, args: ValidationArguments): boolean {
    const obj = args.object as { documentType?: DocumentType };
    const docType = obj.documentType ?? DocumentType.RUC;
    const value = (taxId ?? '').trim();
    if (!value) return true; // @IsNotEmpty handles empty

    switch (docType) {
      case DocumentType.CEDULA:
        return /^\d{10}$/.test(value);
      case DocumentType.RUC:
        return /^\d{10}$/.test(value) || /^\d{13}$/.test(value);
      case DocumentType.PASSPORT:
        return /^[A-Za-z0-9]+$/.test(value) && value.length <= 20;
      case DocumentType.CONSUMIDOR_FINAL:
        return value === CONSUMIDOR_FINAL_TAX_ID;
      default:
        return true;
    }
  }

  defaultMessage(args: ValidationArguments): string {
    const obj = args.object as { documentType?: DocumentType };
    const docType = obj.documentType ?? DocumentType.RUC;
    switch (docType) {
      case DocumentType.CEDULA:
        return 'La cédula debe tener exactamente 10 dígitos numéricos';
      case DocumentType.RUC:
        return 'El RUC debe tener 10 o 13 dígitos numéricos';
      case DocumentType.PASSPORT:
        return 'El pasaporte debe ser alfanumérico (máx. 20 caracteres)';
      case DocumentType.CONSUMIDOR_FINAL:
        return 'Consumidor Final debe usar el RUC 9999999999999';
      default:
        return 'Identificación inválida';
    }
  }
}
