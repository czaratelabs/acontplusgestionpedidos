export enum DocumentType {
  CEDULA = 'CEDULA',
  RUC = 'RUC',
  PASSPORT = 'PASSPORT',
  CONSUMIDOR_FINAL = 'CONSUMIDOR_FINAL',
}

/** SRI standard taxId for Consumidor Final (one per company). */
export const CONSUMIDOR_FINAL_TAX_ID = '9999999999999';

/** SRI document type letter codes for storage. */
export const SRI_DOCUMENT_TYPE_CODE: Record<DocumentType, string> = {
  [DocumentType.CEDULA]: 'C',
  [DocumentType.RUC]: 'R',
  [DocumentType.PASSPORT]: 'P',
  [DocumentType.CONSUMIDOR_FINAL]: 'F',
};

export type SriPersonType = '01' | '02'; // 01 = Persona natural, 02 = Sociedad
