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
import { CONSUMIDOR_FINAL_TAX_ID } from './enums/document-type.enum';

@Injectable()
export class ContactsService {
  constructor(
    @InjectRepository(Contact)
    private contactRepo: Repository<Contact>,
    @InjectRepository(Company)
    private companyRepo: Repository<Company>,
  ) {}

  /** Normalize RUC: 10 digits -> 13 with suffix '001'. Consumidor Final (9999999999999) is never changed. */
  private normalizeTaxId(taxId: string, sriDocumentTypeCode: string): string {
    const t = taxId.trim();
    if (t === CONSUMIDOR_FINAL_TAX_ID) return t;
    if (sriDocumentTypeCode === 'R' && /^\d{10}$/.test(t)) {
      return t + '001';
    }
    return t;
  }

  /**
   * For Ecuador natural persons: Cédula (10 digits) and RUC (13 = 10 + '001') refer to the same person.
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
   * Smart Create (Upsert-like). Supports Auto-Upgrade from Cédula to RUC at POS:
   * when the cashier enters a 13-digit RUC and the contact was registered with the 10-digit Cédula,
   * we upgrade the existing record instead of creating a duplicate — preserving sales history.
   *
   * Consumidor Final: sriDocumentTypeCode === 'F'.
   */
  async create(companyId: string, dto: CreateContactDto): Promise<Contact> {
    const company = await this.companyRepo.findOneBy({ id: companyId });
    if (!company) throw new NotFoundException('Empresa no encontrada');

    const normalizedTaxId = this.normalizeTaxId(dto.taxId, dto.sriDocumentTypeCode);
    const candidates = this.getTaxIdCandidates(normalizedTaxId);
    const existing = await this.contactRepo
      .createQueryBuilder('contact')
      .leftJoinAndSelect('contact.company', 'company')
      .where('contact.companyId = :companyId', { companyId })
      .andWhere('contact.taxId IN (:...candidates)', { candidates })
      .getOne();

    if (existing) {
      if (normalizedTaxId === CONSUMIDOR_FINAL_TAX_ID) {
        existing.sriDocumentTypeCode = 'F';
        existing.sriPersonType = dto.sriPersonType;
        existing.isClient = existing.isClient || dto.isClient === true;
        existing.isSupplier = existing.isSupplier || dto.isSupplier === true;
        existing.isEmployee = existing.isEmployee || dto.isEmployee === true;
        return this.contactRepo.save(existing);
      }

      const existingIsRuc = existing.taxId.length === 13;
      const incomingIsRuc = normalizedTaxId.length === 13;

      if (!incomingIsRuc && existingIsRuc) {
        existing.isClient = existing.isClient || dto.isClient === true;
        existing.isSupplier = existing.isSupplier || dto.isSupplier === true;
        existing.isEmployee = existing.isEmployee || dto.isEmployee === true;
        return this.contactRepo.save(existing);
      }

      if (incomingIsRuc && !existingIsRuc) {
        existing.taxId = normalizedTaxId;
        existing.sriDocumentTypeCode = 'R';
        existing.sriPersonType = dto.sriPersonType;
        existing.name = dto.name;
        existing.tradeName = dto.tradeName?.trim() ?? existing.tradeName;
        existing.email = dto.email?.trim() ?? existing.email;
        existing.phone = dto.phone?.trim() ?? existing.phone;
        existing.address = dto.address?.trim() ?? existing.address;
        existing.isClient = existing.isClient || dto.isClient === true;
        existing.isSupplier = existing.isSupplier || dto.isSupplier === true;
        existing.isEmployee = existing.isEmployee || dto.isEmployee === true;
        return this.contactRepo.save(existing);
      }

      existing.name = dto.name;
      existing.tradeName = dto.tradeName?.trim() ?? existing.tradeName;
      existing.taxId = normalizedTaxId;
      existing.sriDocumentTypeCode = dto.sriDocumentTypeCode;
      existing.sriPersonType = dto.sriPersonType;
      existing.email = dto.email?.trim() ?? existing.email;
      existing.phone = dto.phone?.trim() ?? existing.phone;
      existing.address = dto.address?.trim() ?? existing.address;
      existing.isClient = existing.isClient || dto.isClient === true;
      existing.isSupplier = existing.isSupplier || dto.isSupplier === true;
      existing.isEmployee = existing.isEmployee || dto.isEmployee === true;
      if (dto.jobTitle !== undefined) existing.jobTitle = dto.jobTitle?.trim() ?? null;
      if (dto.salary !== undefined) existing.salary = dto.salary == null ? null : String(dto.salary);
      return this.contactRepo.save(existing);
    }

    const contact = this.contactRepo.create({
      name: dto.name,
      tradeName: dto.tradeName?.trim() ?? null,
      sriDocumentTypeCode: dto.sriDocumentTypeCode,
      sriPersonType: dto.sriPersonType,
      taxId: normalizedTaxId,
      email: dto.email?.trim() ?? null,
      phone: dto.phone?.trim() ?? null,
      address: dto.address?.trim() ?? null,
      isClient: dto.isClient ?? false,
      isSupplier: dto.isSupplier ?? false,
      isEmployee: dto.isEmployee ?? false,
      jobTitle: dto.jobTitle?.trim() ?? null,
      salary: dto.salary == null ? null : String(dto.salary),
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
      type === 'client' || type === 'supplier' || type === 'employee'
        ? type
        : 'all';
    const trimmedSearch =
      typeof search === 'string' ? search.trim() : undefined;
    const hasSearch = !!trimmedSearch && trimmedSearch.length > 0;
    const searchPattern = hasSearch ? `%${trimmedSearch}%` : undefined;

    if (!hasSearch) {
      const baseWhere: {
        company: { id: string };
        isClient?: boolean;
        isSupplier?: boolean;
        isEmployee?: boolean;
      } = { company: { id: companyId } };
      if (effectiveType === 'client') baseWhere.isClient = true;
      if (effectiveType === 'supplier') baseWhere.isSupplier = true;
      if (effectiveType === 'employee') baseWhere.isEmployee = true;
      return this.contactRepo.find({
        where: baseWhere,
        order: { name: 'ASC' },
      });
    }

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
    if (effectiveType === 'employee') {
      qb.andWhere('contact.isEmployee = :isEmployee', { isEmployee: true });
    }

    return qb.getMany();
  }

  /**
   * Lookup contact by taxId within a company (for autocomplete / fusion).
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

    const docCode = dto.sriDocumentTypeCode ?? contact.sriDocumentTypeCode;
    if (dto.taxId !== undefined) {
      const normalized = this.normalizeTaxId(dto.taxId, docCode);
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
    if (dto.sriDocumentTypeCode !== undefined)
      contact.sriDocumentTypeCode = dto.sriDocumentTypeCode;
    if (dto.sriPersonType !== undefined) contact.sriPersonType = dto.sriPersonType;
    if (dto.email !== undefined) contact.email = dto.email?.trim() ?? null;
    if (dto.phone !== undefined) contact.phone = dto.phone?.trim() ?? null;
    if (dto.address !== undefined) contact.address = dto.address?.trim() ?? null;

    if (dto.isClient !== undefined)
      contact.isClient = contact.isClient || dto.isClient;
    if (dto.isSupplier !== undefined)
      contact.isSupplier = contact.isSupplier || dto.isSupplier;
    if (dto.isEmployee !== undefined)
      contact.isEmployee = contact.isEmployee || dto.isEmployee;
    if (dto.jobTitle !== undefined)
      contact.jobTitle = dto.jobTitle?.trim() ?? null;
    if (dto.salary !== undefined)
      contact.salary = dto.salary == null ? null : String(dto.salary);

    return this.contactRepo.save(contact);
  }

  async remove(id: string): Promise<void> {
    const contact = await this.contactRepo.findOneBy({ id });
    if (!contact) throw new NotFoundException('Contacto no encontrado');
    await this.contactRepo.remove(contact);
  }
}
