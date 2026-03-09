import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { ContactsService } from './contacts.service';
import { Contact } from './entities/contact.entity';
import { Company } from '../companies/entities/company.entity';
import { CreateContactDto } from './dto/create-contact.dto';
import { CONSUMIDOR_FINAL_TAX_ID } from './enums/document-type.enum';

describe('ContactsService', () => {
  let service: ContactsService;
  let contactRepo: {
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
    find: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let companyRepo: { findOneBy: jest.Mock };

  const companyId = 'company-1';
  const mockCompany = { id: companyId, name: 'Empresa Test' };

  const createMockQueryBuilder = (getOneResult: unknown = null, getManyResult: unknown[] = []) => {
    return jest.fn().mockReturnValue({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(getOneResult),
      getMany: jest.fn().mockResolvedValue(getManyResult),
    });
  };

  beforeEach(async () => {
    contactRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      createQueryBuilder: createMockQueryBuilder(null),
    };

    companyRepo = {
      findOneBy: jest.fn().mockResolvedValue(mockCompany),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContactsService,
        {
          provide: getRepositoryToken(Contact),
          useValue: contactRepo,
        },
        {
          provide: getRepositoryToken(Company),
          useValue: companyRepo,
        },
      ],
    }).compile();

    service = module.get<ContactsService>(ContactsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('2.1.3.1 - Normalización RUC: cédula 10 dígitos → RUC 13 dígitos (+001)', () => {
    it('normaliza cédula de 10 dígitos a RUC 13 cuando sriDocumentTypeCode es R', async () => {
      const dto: CreateContactDto = {
        name: 'Juan Pérez',
        sriDocumentTypeCode: 'R',
        sriPersonType: '01',
        taxId: '1234567890',
      };

      contactRepo.createQueryBuilder = createMockQueryBuilder(null);
      contactRepo.create.mockReturnValue({});
      contactRepo.save.mockResolvedValue({
        id: 'contact-1',
        taxId: '1234567890001',
        name: dto.name,
        company: mockCompany,
      });

      const result = await service.create(companyId, dto);

      expect(result.taxId).toBe('1234567890001');
      expect(contactRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          taxId: '1234567890001',
          name: dto.name,
        }),
      );
    });

    it('no modifica Consumidor Final (9999999999999)', async () => {
      const dto: CreateContactDto = {
        name: 'Consumidor Final',
        sriDocumentTypeCode: 'F',
        sriPersonType: '01',
        taxId: CONSUMIDOR_FINAL_TAX_ID,
      };

      contactRepo.createQueryBuilder = createMockQueryBuilder(null);
      contactRepo.create.mockReturnValue({});
      contactRepo.save.mockResolvedValue({
        id: 'contact-cf',
        taxId: CONSUMIDOR_FINAL_TAX_ID,
        name: dto.name,
      });

      const result = await service.create(companyId, dto);

      expect(result.taxId).toBe(CONSUMIDOR_FINAL_TAX_ID);
    });

    it('no agrega 001 cuando sriDocumentTypeCode es C (Cédula)', async () => {
      const dto: CreateContactDto = {
        name: 'Maria López',
        sriDocumentTypeCode: 'C',
        sriPersonType: '01',
        taxId: '0987654321',
      };

      contactRepo.createQueryBuilder = createMockQueryBuilder(null);
      contactRepo.create.mockReturnValue({});
      contactRepo.save.mockResolvedValue({
        id: 'contact-2',
        taxId: '0987654321',
        name: dto.name,
      });

      const result = await service.create(companyId, dto);

      expect(result.taxId).toBe('0987654321');
    });
  });

  describe('2.1.3.2 - Upsert inteligente cédula→RUC', () => {
    it('actualiza contacto existente con cédula cuando se ingresa RUC de 13 dígitos', async () => {
      const existingContact = {
        id: 'contact-old',
        taxId: '1234567890',
        name: 'Juan Pérez',
        sriDocumentTypeCode: 'C',
        sriPersonType: '01',
        company: mockCompany,
        isClient: false,
        isSupplier: false,
        isEmployee: false,
      };

      contactRepo.createQueryBuilder = createMockQueryBuilder(existingContact);
      contactRepo.save.mockImplementation((c) => Promise.resolve({ ...c }));

      const dto: CreateContactDto = {
        name: 'Juan Pérez Actualizado',
        sriDocumentTypeCode: 'R',
        sriPersonType: '01',
        taxId: '1234567890001',
        isClient: true,
      };

      const result = await service.create(companyId, dto);

      expect(contactRepo.create).not.toHaveBeenCalled();
      expect(contactRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          taxId: '1234567890001',
          sriDocumentTypeCode: 'R',
          name: 'Juan Pérez Actualizado',
        }),
      );
      expect(result.taxId).toBe('1234567890001');
    });

    it('encuentra contacto por cédula cuando se busca con RUC (getTaxIdCandidates)', async () => {
      const existingContact = {
        id: 'contact-cedula',
        taxId: '1234567890',
        name: 'Contacto Cédula',
        sriDocumentTypeCode: 'C',
        company: mockCompany,
        isClient: false,
        isSupplier: false,
        isEmployee: false,
      };

      contactRepo.createQueryBuilder = createMockQueryBuilder(existingContact);
      contactRepo.save.mockImplementation((c) => Promise.resolve(c));

      const dto: CreateContactDto = {
        name: 'Contacto Cédula',
        sriDocumentTypeCode: 'R',
        sriPersonType: '01',
        taxId: '1234567890001',
        isClient: true,
      };

      const result = await service.create(companyId, dto);

      expect(result.taxId).toBe('1234567890001');
      expect(contactRepo.save).toHaveBeenCalled();
    });
  });

  describe('2.1.3.3 - Tipos de documento SRI (C, R, P, F)', () => {
    it('crea contacto con tipo C (Cédula) - 10 dígitos', async () => {
      const dto: CreateContactDto = {
        name: 'Cédula User',
        sriDocumentTypeCode: 'C',
        sriPersonType: '01',
        taxId: '1712345678',
      };

      contactRepo.createQueryBuilder = createMockQueryBuilder(null);
      contactRepo.create.mockReturnValue({});
      contactRepo.save.mockResolvedValue({ id: 'c1', taxId: '1712345678', ...dto });

      const result = await service.create(companyId, dto);

      expect(contactRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          sriDocumentTypeCode: 'C',
          taxId: '1712345678',
        }),
      );
    });

    it('crea contacto con tipo R (RUC) - acepta 10 o 13 dígitos', async () => {
      contactRepo.createQueryBuilder = createMockQueryBuilder(null);
      contactRepo.create.mockReturnValue({});
      contactRepo.save.mockResolvedValue({});

      const dto10: CreateContactDto = {
        name: 'RUC 10',
        sriDocumentTypeCode: 'R',
        sriPersonType: '01',
        taxId: '1234567890',
      };
      await service.create(companyId, dto10);
      expect(contactRepo.create).toHaveBeenLastCalledWith(
        expect.objectContaining({ taxId: '1234567890001', sriDocumentTypeCode: 'R' }),
      );

      contactRepo.create.mockClear();
      contactRepo.createQueryBuilder = createMockQueryBuilder(null);
      const dto13: CreateContactDto = {
        name: 'RUC 13',
        sriDocumentTypeCode: 'R',
        sriPersonType: '02',
        taxId: '1234567890001',
      };
      await service.create(companyId, dto13);
      expect(contactRepo.create).toHaveBeenLastCalledWith(
        expect.objectContaining({ taxId: '1234567890001', sriDocumentTypeCode: 'R' }),
      );
    });

    it('crea contacto con tipo P (Pasaporte)', async () => {
      const dto: CreateContactDto = {
        name: 'Pasaporte User',
        sriDocumentTypeCode: 'P',
        sriPersonType: '01',
        taxId: 'AB123456',
      };

      contactRepo.createQueryBuilder = createMockQueryBuilder(null);
      contactRepo.create.mockReturnValue({});
      contactRepo.save.mockResolvedValue({ id: 'p1', taxId: 'AB123456', ...dto });

      const result = await service.create(companyId, dto);

      expect(contactRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          sriDocumentTypeCode: 'P',
          taxId: 'AB123456',
        }),
      );
    });

    it('crea contacto con tipo F (Consumidor Final)', async () => {
      const dto: CreateContactDto = {
        name: 'Consumidor Final',
        sriDocumentTypeCode: 'F',
        sriPersonType: '01',
        taxId: CONSUMIDOR_FINAL_TAX_ID,
      };

      contactRepo.createQueryBuilder = createMockQueryBuilder(null);
      contactRepo.create.mockReturnValue({});
      contactRepo.save.mockResolvedValue({ id: 'cf1', taxId: CONSUMIDOR_FINAL_TAX_ID });

      const result = await service.create(companyId, dto);

      expect(result.taxId).toBe(CONSUMIDOR_FINAL_TAX_ID);
      expect(contactRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          sriDocumentTypeCode: 'F',
          taxId: CONSUMIDOR_FINAL_TAX_ID,
        }),
      );
    });
  });

  describe('2.1.3.4 - Validación RUC / búsqueda por taxId', () => {
    it('findByTaxId retorna contacto cuando taxId coincide (cédula o RUC)', async () => {
      const contact = { id: 'c1', taxId: '1234567890', company: mockCompany };
      contactRepo.findOne.mockResolvedValue(contact);

      const result = await service.findByTaxId(companyId, '1234567890001');

      expect(result).toEqual(contact);
      expect(contactRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.any(Array),
        }),
      );
    });

    it('findByTaxId retorna null cuando taxId está vacío', async () => {
      const result = await service.findByTaxId(companyId, '  ');

      expect(result).toBeNull();
      expect(contactRepo.findOne).not.toHaveBeenCalled();
    });

    it('lanza NotFoundException cuando la empresa no existe', async () => {
      companyRepo.findOneBy.mockResolvedValue(null);

      const dto: CreateContactDto = {
        name: 'Test',
        sriDocumentTypeCode: 'R',
        sriPersonType: '01',
        taxId: '1234567890',
      };

      await expect(service.create('company-inexistente', dto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.create('company-inexistente', dto)).rejects.toThrow(
        'Empresa no encontrada',
      );
    });
  });
});
