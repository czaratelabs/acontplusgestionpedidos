import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { CONSUMIDOR_FINAL_TAX_ID } from '../enums/document-type.enum';

@ValidatorConstraint({ name: 'TaxIdByDocumentType', async: false })
export class TaxIdByDocumentTypeValidator implements ValidatorConstraintInterface {
  validate(taxId: string, args: ValidationArguments): boolean {
    const obj = args.object as { sriDocumentTypeCode?: string };
    const docCode = obj.sriDocumentTypeCode ?? 'R';
    const value = (taxId ?? '').trim();
    if (!value) return true; // @IsNotEmpty handles empty

    switch (docCode) {
      case 'C':
        return /^\d{10}$/.test(value);
      case 'R':
        return /^\d{10}$/.test(value) || /^\d{13}$/.test(value);
      case 'P':
        return /^[A-Za-z0-9]+$/.test(value) && value.length <= 20;
      case 'F':
        return value === CONSUMIDOR_FINAL_TAX_ID;
      default:
        return true;
    }
  }

  defaultMessage(args: ValidationArguments): string {
    const obj = args.object as { sriDocumentTypeCode?: string };
    const docCode = obj.sriDocumentTypeCode ?? 'R';
    switch (docCode) {
      case 'C':
        return 'La cédula debe tener exactamente 10 dígitos numéricos';
      case 'R':
        return 'El RUC debe tener 10 o 13 dígitos numéricos';
      case 'P':
        return 'El pasaporte debe ser alfanumérico (máx. 20 caracteres)';
      case 'F':
        return 'Consumidor Final debe usar el RUC 9999999999999';
      default:
        return 'Identificación inválida';
    }
  }
}
