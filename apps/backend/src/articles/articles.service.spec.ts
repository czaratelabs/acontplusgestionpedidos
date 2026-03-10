import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ArticlesService } from './articles.service';
import { CompaniesService } from '../companies/companies.service';
import { Article } from './entities/article.entity';
import { ArticleVariant } from './entities/article-variant.entity';
import { ArticleVariantPrice } from './entities/article-variant-price.entity';
import { ArticleImage } from './entities/article-image.entity';
import { ArticleVariantBatch } from './entities/article-variant-batch.entity';
import { ArticleVariantBarcode } from './entities/article-variant-barcode.entity';
import { CreateArticleDto } from './dto/create-article.dto';
import { CreateArticleVariantDto } from './dto/create-article.dto';

describe('ArticlesService', () => {
  let service: ArticlesService;
  let companiesService: jest.Mocked<CompaniesService>;
  let articleRepo: { findOne: jest.Mock; find: jest.Mock; create: jest.Mock; save: jest.Mock };
  let variantRepo: {
    findOne: jest.Mock;
    find: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    createQueryBuilder: jest.Mock;
    delete: jest.Mock;
    remove: jest.Mock;
  };
  let priceRepo: { findOne: jest.Mock; create: jest.Mock; save: jest.Mock };
  let barcodeRepo: {
    create: jest.Mock;
    save: jest.Mock;
    createQueryBuilder: jest.Mock;
    delete: jest.Mock;
  };

  const companyId = 'company-1';
  const mockArticle = {
    id: 'article-1',
    code: 'ART001',
    name: 'Artículo Test',
    companyId,
    variants: [],
    images: [],
  };

  const mockVariant = {
    id: 'variant-1',
    articleId: 'article-1',
    companyId,
    sku: 'SKU001',
    barcode: '1234567890123',
    cost: 10,
    is_active: true,
    batches: [],
    barcodes: [],
    prices: [],
  };

  const createMockQueryBuilder = (getOneResult: unknown = null, getManyResult: unknown[] = []) => {
    const chain = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(getOneResult),
      getMany: jest.fn().mockResolvedValue(getManyResult),
      innerJoin: jest.fn().mockReturnThis(),
    };
    return jest.fn().mockReturnValue(chain);
  };

  beforeEach(async () => {
    articleRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    variantRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: createMockQueryBuilder(null, []),
      delete: jest.fn().mockResolvedValue(undefined),
      remove: jest.fn().mockResolvedValue(undefined),
    };

    priceRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    barcodeRepo = {
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: createMockQueryBuilder(null),
      delete: jest.fn().mockResolvedValue(undefined),
    };

    const imageRepo = { findOne: jest.fn(), create: jest.fn(), save: jest.fn(), update: jest.fn(), remove: jest.fn() };
    const batchRepo = { findOne: jest.fn(), create: jest.fn(), save: jest.fn(), remove: jest.fn() };

    const managerSave = jest.fn().mockImplementation((_entity, row: unknown) => {
      const r = row as { id?: string };
      if (r && !r.id && typeof r === 'object') (r as { id: string }).id = 'mock-id';
      return Promise.resolve(row);
    });
    const managerDelete = jest.fn().mockResolvedValue(undefined);
    const mockDataSource = {
      createQueryRunner: jest.fn().mockReturnValue({
        connect: jest.fn().mockResolvedValue(undefined),
        startTransaction: jest.fn().mockResolvedValue(undefined),
        commitTransaction: jest.fn().mockResolvedValue(undefined),
        rollbackTransaction: jest.fn().mockResolvedValue(undefined),
        release: jest.fn().mockResolvedValue(undefined),
        manager: {
          save: managerSave,
          delete: managerDelete,
        },
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: DataSource, useValue: mockDataSource },
        ArticlesService,
        {
          provide: getRepositoryToken(Article),
          useValue: articleRepo,
        },
        {
          provide: getRepositoryToken(ArticleVariant),
          useValue: variantRepo,
        },
        {
          provide: getRepositoryToken(ArticleVariantPrice),
          useValue: priceRepo,
        },
        {
          provide: getRepositoryToken(ArticleImage),
          useValue: imageRepo,
        },
        {
          provide: getRepositoryToken(ArticleVariantBatch),
          useValue: batchRepo,
        },
        {
          provide: getRepositoryToken(ArticleVariantBarcode),
          useValue: barcodeRepo,
        },
        {
          provide: CompaniesService,
          useValue: {
            assertResourceLimit: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get<ArticlesService>(ArticlesService);
    companiesService = module.get(CompaniesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('2.1.2.1 - Crear artículo con variantes', () => {
    it('crea artículo correctamente y llama a assertResourceLimit', async () => {
      const savedArticle = { ...mockArticle, id: 'article-1', variants: [], images: [], brand: null, category: null, tax: null };
      articleRepo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(savedArticle);
      articleRepo.create.mockReturnValue(mockArticle);
      articleRepo.save.mockResolvedValue({ ...mockArticle, id: 'article-1' });

      const dto: CreateArticleDto = {
        code: 'ART001',
        name: 'Artículo Nuevo',
      };

      await service.create(companyId, dto);

      expect(companiesService.assertResourceLimit).toHaveBeenCalledWith(
        companyId,
        'max_inventory_items',
        'artículos',
      );
      expect(articleRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'ART001',
          name: 'Artículo Nuevo',
          companyId,
        }),
      );
      expect(articleRepo.save).toHaveBeenCalled();
    });

    it('crea variante via createVariant después de crear artículo', async () => {
      const articleWithVariants = {
        ...mockArticle,
        code: 'ART001',
        variants: [],
        images: [],
        brand: null,
        category: null,
        tax: null,
      };
      const savedVariant = { ...mockVariant, id: 'variant-1' };

      articleRepo.findOne.mockResolvedValue(articleWithVariants);
      variantRepo.findOne.mockResolvedValue(null);
      variantRepo.create.mockReturnValue(mockVariant);
      variantRepo.save.mockResolvedValue(savedVariant);
      priceRepo.create.mockReturnValue({});
      priceRepo.save.mockResolvedValue({});

      const dto: CreateArticleVariantDto = {
        sku: 'SKU001',
        barcode: '1234567890123',
      };

      const result = await service.createVariant('article-1', companyId, dto);

      expect(result).toBeDefined();
      expect(variantRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          sku: 'SKU001',
          barcode: '1234567890123',
          articleId: 'article-1',
          companyId,
        }),
      );
      expect(priceRepo.create).toHaveBeenCalled();
    });
  });

  describe('2.1.2.2 - Búsqueda por código de barras', () => {
    it('isBarcodeAvailable retorna true cuando el barcode no está en uso', async () => {
      variantRepo.findOne.mockResolvedValue(null);
      barcodeRepo.createQueryBuilder = createMockQueryBuilder(null);

      const result = await service.isBarcodeAvailable(companyId, '1234567890123');

      expect(result).toBe(true);
    });

    it('isBarcodeAvailable retorna false cuando el barcode ya está en una variante', async () => {
      variantRepo.findOne.mockResolvedValue({ id: 'v1', barcode: '1234567890123' });

      const result = await service.isBarcodeAvailable(companyId, '1234567890123');

      expect(result).toBe(false);
    });

    it('searchVariant encuentra variante por barcode', async () => {
      const variantWithArticle = {
        ...mockVariant,
        article: mockArticle,
        barcodes: [],
        prices: [],
      };
      variantRepo.createQueryBuilder = createMockQueryBuilder(variantWithArticle);

      const result = await service.searchVariant(companyId, '1234567890123');

      expect(result).toEqual(variantWithArticle);
    });

    it('searchVariants retorna array vacío cuando q está vacío', async () => {
      const result = await service.searchVariants(companyId, '  ');

      expect(result).toEqual([]);
    });
  });

  describe('2.1.2.3 - Full-Text Search (FTS) por nombre', () => {
    it('searchVariant usa FTS en la consulta (verificar que createQueryBuilder se llama)', async () => {
      variantRepo.createQueryBuilder = createMockQueryBuilder(null);

      await service.searchVariant(companyId, 'producto test');

      expect(variantRepo.createQueryBuilder).toHaveBeenCalled();
    });

    it('searchVariants encuentra por FTS cuando no hay match por código ni barcode', async () => {
      const variantByFts = { ...mockVariant, article: mockArticle };
      const qbChain = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
        getOne: jest.fn(),
      };
      qbChain.getOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(variantByFts);
      variantRepo.createQueryBuilder = jest.fn().mockReturnValue(qbChain);

      const result = await service.searchVariants(companyId, 'producto');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(variantByFts);
    });
  });

  describe('2.1.2.4 - Verificación de límites de plan (max_inventory_items)', () => {
    it('create llama a assertResourceLimit antes de crear', async () => {
      const savedArticle = { ...mockArticle, id: 'article-2', variants: [], images: [], brand: null, category: null, tax: null };
      articleRepo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(savedArticle);
      articleRepo.create.mockReturnValue(mockArticle);
      articleRepo.save.mockResolvedValue({ ...mockArticle, id: 'article-2' });

      await service.create(companyId, { code: 'ART002', name: 'Art 2' });

      expect(companiesService.assertResourceLimit).toHaveBeenCalledWith(
        companyId,
        'max_inventory_items',
        'artículos',
      );
    });

    it('create lanza ForbiddenException cuando assertResourceLimit falla', async () => {
      (companiesService.assertResourceLimit as jest.Mock).mockRejectedValue(
        new ForbiddenException('Límite de artículos alcanzado'),
      );

      await expect(
        service.create(companyId, { code: 'ART002', name: 'Art 2' }),
      ).rejects.toThrow(ForbiddenException);

      expect(articleRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('2.1.2.5 - Validación de barcode duplicado', () => {
    it('createVariant lanza ConflictException cuando el barcode principal ya está asignado', async () => {
      const article = { ...mockArticle, code: 'ART001' };
      articleRepo.findOne.mockResolvedValue(article);
      variantRepo.findOne.mockImplementation((opts: { where?: Record<string, unknown> }) => {
        const w = opts?.where as Record<string, string> | undefined;
        if (w?.barcode === '1234567890123') {
          return Promise.resolve({ id: 'otra-variant', barcode: '1234567890123' });
        }
        return Promise.resolve(null);
      });

      const dto: CreateArticleVariantDto = {
        sku: 'SKU-NEW',
        barcode: '1234567890123',
      };

      await expect(service.createVariant('article-1', companyId, dto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.createVariant('article-1', companyId, dto)).rejects.toThrow(
        'código de barras principal ya está asignado',
      );
    });

    it('createVariant lanza ConflictException cuando un barcode adicional está duplicado', async () => {
      const article = { ...mockArticle, code: 'ART001' };
      articleRepo.findOne.mockResolvedValue(article);
      variantRepo.findOne.mockResolvedValue(null);
      const createChain = (getOneResult: unknown) => ({
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(getOneResult),
      });
      let callCount = 0;
      barcodeRepo.createQueryBuilder = jest.fn().mockImplementation(() => {
        callCount++;
        const getOneResult = callCount === 2
          ? { id: 'b1', articleVariantId: 'other-variant', barcode: 'extra-barcode' }
          : null;
        return createChain(getOneResult);
      });
      variantRepo.create.mockReturnValue(mockVariant);
      variantRepo.save.mockResolvedValue({ ...mockVariant, id: 'variant-1' });
      priceRepo.create.mockReturnValue({});
      priceRepo.save.mockResolvedValue({});

      const dto: CreateArticleVariantDto = {
        sku: 'SKU-NEW',
        barcode: 'master-ok-unique',
        barcodes: [{ barcode: 'extra-barcode', description: null }],
      };

      await expect(service.createVariant('article-1', companyId, dto)).rejects.toThrow(
        /ya está asignado a otro artículo o variante/,
      );
    });

    it('create lanza ConflictException cuando el código maestro ya existe', async () => {
      (companiesService.assertResourceLimit as jest.Mock).mockResolvedValue(undefined);
      articleRepo.findOne.mockResolvedValue({ ...mockArticle, code: 'ART001' });

      const dto: CreateArticleDto = { code: 'ART001', name: 'Artículo' };

      await expect(service.create(companyId, dto)).rejects.toThrow(ConflictException);
      await expect(service.create(companyId, dto)).rejects.toThrow(
        'Ya existe un artículo con ese código',
      );
    });
  });
});
