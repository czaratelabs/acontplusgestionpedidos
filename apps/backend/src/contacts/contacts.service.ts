import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets } from 'typeorm';
import { Contact } from './entities/contact.entity';
import { Company } from '../companies/entities/company.entity';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import type { ContactTypeFilter } from './dto/search-contact.dto';
import {
  DocumentType,
  CONSUMIDOR_FINAL_TAX_ID,
  SRI_DOCUMENT_TYPE_CODE,
} from './enums/document-type.enum';

@Injectable()
export class ContactsService {
  constructor(
    @InjectRepository(Contact)
    private contactRepo: Repository<Contact>,
    @InjectRepository(Company)
    private companyRepo: Repository<Company>,
  ) {}

  /** Normalize RUC: 10 digits -> 13 with suffix '001'. Consumidor Final (9999999999999) is never changed. */
  private normalizeTaxId(taxId: string, documentType: DocumentType): string {
    const t = taxId.trim();
    if (t === CONSUMIDOR_FINAL_TAX_ID) return t;
    if (documentType === DocumentType.RUC && /^\d{10}$/.test(t)) {
      return t + '001';
    }
    return t;
  }

  /**
   * For Ecuador natural persons: CEDULA (10 digits) and RUC (13 = 10 + '001') refer to the same person.
   * Returns [input, linked] for lookup/create to avoid duplicates.
   */
  private getTaxIdCandidates(taxId: string): string[] {
    const t = taxId?.trim();
    if (!t || t === CONSUMIDOR_FINAL_TAX_ID) return [t];
    if (/^\d{10}$/.test(t)) return [t, t + '001'];
    if (/^\d{13}$/.test(t)) return [t, t.slice(0, 10)];
    return [t];
  }

  /**
   * Smart Create (Upsert-like). Supports Auto-Upgrade from CEDULA to RUC at POS:
   * when the cashier enters a 13-digit RUC and the contact was registered with the 10-digit CEDULA,
   * we upgrade the existing record instead of creating a duplicate — preserving sales history.
   *
   * Search phase (for 13-digit RUC input):
   * - Look for full 13-digit RUC OR 10-digit root (substring 0–10) in the same company.
   * - If a CEDULA (10-digit) match is found → Auto-Upgrade that record to RUC and return it.
   */
  async create(companyId: string, dto: CreateContactDto): Promise<Contact> {
    const company = await this.companyRepo.findOneBy({ id: companyId });
    if (!company) throw new NotFoundException('Empresa no encontrada');

    const normalizedTaxId = this.normalizeTaxId(dto.taxId, dto.documentType);
    // Search: 13-digit RUC → [RUC, CEDULA root]; 10-digit CEDULA → [CEDULA, RUC]; else exact
    const candidates = this.getTaxIdCandidates(normalizedTaxId);
    const existing = await this.contactRepo.findOne({
      where: candidates.map((taxId) => ({
        company: { id: companyId },
        taxId,
      })),
      relations: ['company'],
    });

    if (existing) {
      if (normalizedTaxId === CONSUMIDOR_FINAL_TAX_ID) {
        existing.sriDocumentTypeCode = SRI_DOCUMENT_TYPE_CODE[DocumentType.CONSUMIDOR_FINAL];
        existing.isClient = existing.isClient || dto.isClient === true;
        existing.isSupplier = existing.isSupplier || dto.isSupplier === true;
        return this.contactRepo.save(existing);
      }

      const existingIsRuc = existing.taxId.length === 13;
      const incomingIsRuc = normalizedTaxId.length === 13;

      // Incoming CEDULA (10) but existing has RUC (13): prefer existing, only update roles
      if (!incomingIsRuc && existingIsRuc) {
        existing.isClient = existing.isClient || dto.isClient === true;
        existing.isSupplier = existing.isSupplier || dto.isSupplier === true;
        return this.contactRepo.save(existing);
      }

      // ——— Auto-Upgrade: CEDULA → RUC (e.g. POS sends RUC for a contact stored as CEDULA) ———
      if (incomingIsRuc && !existingIsRuc) {
        existing.taxId = normalizedTaxId;
        existing.documentType = DocumentType.RUC;
        existing.sriDocumentTypeCode = SRI_DOCUMENT_TYPE_CODE[DocumentType.RUC];
        if (dto.sriPersonType !== undefined) existing.sriPersonType = dto.sriPersonType;
        existing.name = dto.name;
        existing.tradeName = dto.tradeName?.trim() ?? existing.tradeName;
        existing.email = dto.email?.trim() ?? existing.email;
        existing.phone = dto.phone?.trim() ?? existing.phone;
        existing.address = dto.address?.trim() ?? existing.address;
        existing.isClient = existing.isClient || dto.isClient === true;
        existing.isSupplier = existing.isSupplier || dto.isSupplier === true;
        return this.contactRepo.save(existing);
      }

      // Exact or same-length match: standard merge
      existing.name = dto.name;
      existing.tradeName = dto.tradeName?.trim() ?? existing.tradeName;
      existing.taxId = normalizedTaxId;
      existing.documentType = dto.documentType;
      existing.sriDocumentTypeCode = SRI_DOCUMENT_TYPE_CODE[dto.documentType];
      if (dto.sriPersonType !== undefined) existing.sriPersonType = dto.sriPersonType;
      existing.email = dto.email?.trim() ?? existing.email;
      existing.phone = dto.phone?.trim() ?? existing.phone;
      existing.address = dto.address?.trim() ?? existing.address;
      existing.isClient = existing.isClient || dto.isClient === true;
      existing.isSupplier = existing.isSupplier || dto.isSupplier === true;
      return this.contactRepo.save(existing);
    }

    const contact = this.contactRepo.create({
      name: dto.name,
      tradeName: dto.tradeName?.trim() ?? null,
      documentType: dto.documentType,
      sriDocumentTypeCode: SRI_DOCUMENT_TYPE_CODE[dto.documentType],
      sriPersonType: dto.sriPersonType ?? null,
      taxId: normalizedTaxId,
      email: dto.email?.trim() ?? null,
      phone: dto.phone?.trim() ?? null,
      address: dto.address?.trim() ?? null,
      isClient: dto.isClient ?? false,
      isSupplier: dto.isSupplier ?? false,
      company,
    });
    return this.contactRepo.save(contact);
  }

  /**
   * Find all contacts for a company with optional type filter and search (name or taxId).
   */
  async findAll(
    companyId: string,
    type: ContactTypeFilter = 'all',
    search?: string,
  ): Promise<Contact[]> {
    const effectiveType: ContactTypeFilter =
      type === 'client' || type === 'supplier' ? type : 'all';
    const trimmedSearch =
      typeof search === 'string' ? search.trim() : undefined;
    const hasSearch = !!trimmedSearch && trimmedSearch.length > 0;
    const searchPattern = hasSearch ? `%${trimmedSearch}%` : undefined;

    if (!hasSearch) {
      const baseWhere: {
        company: { id: string };
        isClient?: boolean;
        isSupplier?: boolean;
      } = { company: { id: companyId } };
      if (effectiveType === 'client') baseWhere.isClient = true;
      if (effectiveType === 'supplier') baseWhere.isSupplier = true;
      return this.contactRepo.find({
        where: baseWhere,
        order: { name: 'ASC' },
      });
    }

    // Search by name OR taxId (ILIKE); root ID check: 10/13 digit taxId also matches linked CEDULA/RUC
    const qb = this.contactRepo
      .createQueryBuilder('contact')
      .where('contact.companyId = :companyId', { companyId })
      .andWhere(
        new Brackets((qbOr) => {
          qbOr
            .where('contact.name ILIKE :search', { search: searchPattern })
            .orWhere('contact.taxId ILIKE :search', { search: searchPattern });
          if (/^\d{10}$/.test(trimmedSearch)) {
            qbOr
              .orWhere('contact.taxId = :searchExact10', {
                searchExact10: trimmedSearch,
              })
              .orWhere('contact.taxId = :searchRuc10', {
                searchRuc10: trimmedSearch + '001',
              });
          } else if (/^\d{13}$/.test(trimmedSearch)) {
            qbOr
              .orWhere('contact.taxId = :searchExact13', {
                searchExact13: trimmedSearch,
              })
              .orWhere('contact.taxId = :searchCedula10', {
                searchCedula10: trimmedSearch.slice(0, 10),
              });
          }
        }),
      )
      .orderBy('contact.name', 'ASC');

    if (effectiveType === 'client') {
      qb.andWhere('contact.isClient = :isClient', { isClient: true });
    }
    if (effectiveType === 'supplier') {
      qb.andWhere('contact.isSupplier = :isSupplier', { isSupplier: true });
    }

    return qb.getMany();
  }

  /**
   * Lookup contact by taxId within a company (for autocomplete / fusion).
   * Root ID check: 10 digits (CEDULA) also matches RUC (10+001); 13 digits (RUC) also matches CEDULA (first 10).
   */
  async findByTaxId(
    companyId: string,
    taxId: string,
  ): Promise<Contact | null> {
    const normalized = taxId?.trim();
    if (!normalized) return null;
    const candidates = this.getTaxIdCandidates(normalized);
    return this.contactRepo.findOne({
      where: candidates.map((tid) => ({
        company: { id: companyId },
        taxId: tid,
      })),
      relations: ['company'],
    });
  }

  async findOne(id: string): Promise<Contact> {
    const contact = await this.contactRepo.findOne({
      where: { id },
      relations: ['company'],
    });
    if (!contact) throw new NotFoundException('Contacto no encontrado');
    return contact;
  }

  async update(id: string, dto: UpdateContactDto): Promise<Contact> {
    const contact = await this.contactRepo.findOne({
      where: { id },
      relations: ['company'],
    });
    if (!contact) throw new NotFoundException('Contacto no encontrado');

    const docType = dto.documentType ?? contact.documentType;
    if (dto.taxId !== undefined) {
      const normalized = this.normalizeTaxId(dto.taxId, docType);
      if (normalized !== contact.taxId) {
        const existing = await this.contactRepo.findOne({
          where: {
            company: { id: contact.company.id },
            taxId: normalized,
          },
        });
        if (existing) {
          throw new ConflictException(
            'Ya existe un contacto con este RUC/CI en la empresa',
          );
        }
        contact.taxId = normalized;
      }
    }

    if (dto.name !== undefined) contact.name = dto.name;
    if (dto.tradeName !== undefined)
      contact.tradeName = dto.tradeName?.trim() ?? null;
    if (dto.documentType !== undefined) {
      contact.documentType = dto.documentType;
      contact.sriDocumentTypeCode = SRI_DOCUMENT_TYPE_CODE[dto.documentType];
    }
    if (dto.sriPersonType !== undefined) contact.sriPersonType = dto.sriPersonType;
    if (dto.email !== undefined) contact.email = dto.email?.trim() ?? null;
    if (dto.phone !== undefined) contact.phone = dto.phone?.trim() ?? null;
    if (dto.address !== undefined) contact.address = dto.address?.trim() ?? null;

    // CRITICAL: Role preservation — never remove an existing role (e.g. fusion: add Provider to existing Client)
    if (dto.isClient !== undefined)
      contact.isClient = contact.isClient || dto.isClient;
    if (dto.isSupplier !== undefined)
      contact.isSupplier = contact.isSupplier || dto.isSupplier;

    return this.contactRepo.save(contact);
  }

  async remove(id: string): Promise<void> {
    const contact = await this.contactRepo.findOneBy({ id });
    if (!contact) throw new NotFoundException('Contacto no encontrado');
    await this.contactRepo.remove(contact);
  }
}
