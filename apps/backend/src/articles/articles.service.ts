import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets } from 'typeorm';
import { Article } from './entities/article.entity';
import { ArticleVariant } from './entities/article-variant.entity';
import { ArticleVariantPrice } from './entities/article-variant-price.entity';
import { ArticleImage } from './entities/article-image.entity';
import { ArticleVariantBatch } from './entities/article-variant-batch.entity';
import { ArticleVariantBarcode } from './entities/article-variant-barcode.entity';
import { CreateArticleDto } from './dto/create-article.dto';
import { CreateArticleVariantDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { SaveArticleGeneralDto } from './dto/save-article-general.dto';
import { CreateBatchDto } from './dto/create-batch.dto';
import { UpdateBatchDto } from './dto/update-batch.dto';
import { CompaniesService } from '../companies/companies.service';

@Injectable()
export class ArticlesService {
  constructor(
    @InjectRepository(Article)
    private readonly articleRepo: Repository<Article>,
    @InjectRepository(ArticleVariant)
    private readonly variantRepo: Repository<ArticleVariant>,
    @InjectRepository(ArticleVariantPrice)
    private readonly priceRepo: Repository<ArticleVariantPrice>,
    @InjectRepository(ArticleImage)
    private readonly imageRepo: Repository<ArticleImage>,
    @InjectRepository(ArticleVariantBatch)
    private readonly batchRepo: Repository<ArticleVariantBatch>,
    @InjectRepository(ArticleVariantBarcode)
    private readonly barcodeRepo: Repository<ArticleVariantBarcode>,
    private readonly companiesService: CompaniesService,
  ) {}

  /**
   * Check if a barcode is available (not used by another variant or in additional barcodes).
   * Master barcode and article_variant_barcodes are checked company-wide.
   */
  async isBarcodeAvailable(
    companyId: string,
    barcode: string,
    excludeVariantId?: string,
  ): Promise<boolean> {
    const trimmed = (barcode ?? '').trim();
    if (!trimmed) return false;
    const onVariant = await this.variantRepo.findOne({
      where: { companyId, barcode: trimmed },
    });
    if (onVariant && onVariant.id !== excludeVariantId) return false;
    const onExtra = await this.barcodeRepo
      .createQueryBuilder('b')
      .innerJoin('b.articleVariant', 'v')
      .where('v.company_id = :companyId', { companyId })
      .andWhere('LOWER(b.barcode) = LOWER(:barcode)', { barcode: trimmed })
      .getOne();
    if (onExtra && onExtra.articleVariantId !== excludeVariantId) return false;
    return true;
  }

  /**
   * Búsqueda combinada:
   * - SKU/barcode: coincidencia exacta (case-insensitive)
   * - Nombre artículo: Full-Text Search (FTS) con search_vector
   */
  async searchVariant(companyId: string, q: string): Promise<ArticleVariant | null> {
    const trimmed = (q ?? '').trim();
    if (!trimmed) return null;

    const variant = await this.variantRepo
      .createQueryBuilder('v')
      .leftJoinAndSelect('v.article', 'a')
      .leftJoinAndSelect('v.prices', 'p')
      .leftJoinAndSelect('v.barcodes', 'vb')
      .leftJoinAndSelect('v.color', 'vcolor')
      .leftJoinAndSelect('v.size', 'vsize')
      .leftJoinAndSelect('v.flavor', 'vflavor')
      .leftJoinAndSelect('a.brand', 'b')
      .leftJoinAndSelect('a.category', 'c')
      .leftJoinAndSelect('a.tax', 't')
      .leftJoin('v.barcodes', 'vb_match')
      .where('v.company_id = :companyId', { companyId })
      .andWhere('v.is_active = true')
      .andWhere(
        new Brackets((qb) => {
          qb.where('LOWER(v.barcode) = LOWER(:q)', { q: trimmed })
            .orWhere('LOWER(vb_match.barcode) = LOWER(:q)', { q: trimmed })
            .orWhere('LOWER(v.sku) = LOWER(:q)', { q: trimmed })
            .orWhere('LOWER(a.code) = LOWER(:q)', { q: trimmed })
            .orWhere("a.search_vector @@ plainto_tsquery('spanish', :q)", { q: trimmed });
        }),
      )
      .getOne();

    return variant;
  }

  /**
   * Búsqueda para Punto de Venta: si q es el Código Maestro, devuelve todas las variantes
   * de ese artículo; si no, devuelve una lista con la variante encontrada por SKU/barcode/FTS.
   */
  async searchVariants(companyId: string, q: string): Promise<ArticleVariant[]> {
    const trimmed = (q ?? '').trim();
    if (!trimmed) return [];

    const baseQb = () =>
      this.variantRepo
        .createQueryBuilder('v')
        .leftJoinAndSelect('v.article', 'a')
        .leftJoinAndSelect('v.prices', 'p')
        .leftJoinAndSelect('v.barcodes', 'vb')
        .leftJoinAndSelect('v.color', 'vcolor')
        .leftJoinAndSelect('v.size', 'vsize')
        .leftJoinAndSelect('v.flavor', 'vflavor')
        .leftJoinAndSelect('a.brand', 'b')
        .leftJoinAndSelect('a.category', 'c')
        .leftJoinAndSelect('a.tax', 't')
        .where('v.company_id = :companyId', { companyId })
        .andWhere('v.is_active = true');

    const byCode = await baseQb()
      .andWhere('LOWER(a.code) = LOWER(:q)', { q: trimmed })
      .orderBy('v.sku', 'ASC')
      .getMany();
    if (byCode.length > 0) return byCode;

    const byBarcodeOrSkuQb = baseQb();
    const byBarcodeOrSku = await byBarcodeOrSkuQb
      .leftJoin('v.barcodes', 'vb_match')
      .andWhere(
        new Brackets((qb) => {
          qb.where('LOWER(v.barcode) = LOWER(:q)', { q: trimmed })
            .orWhere('LOWER(vb_match.barcode) = LOWER(:q)', { q: trimmed })
            .orWhere('LOWER(v.sku) = LOWER(:q)', { q: trimmed });
        }),
      )
      .getOne();
    if (byBarcodeOrSku) return [byBarcodeOrSku];

    const byFts = await baseQb()
      .andWhere("a.search_vector @@ plainto_tsquery('spanish', :q)", { q: trimmed })
      .getOne();
    if (byFts) return [byFts];

    return [];
  }

  async findAll(companyId: string): Promise<Article[]> {
    const articles = await this.articleRepo.find({
      where: { companyId },
      relations: ['brand', 'category', 'tax', 'variants', 'variants.color', 'variants.size', 'variants.flavor', 'variants.prices', 'variants.measureUnit', 'variants.batches', 'variants.barcodes', 'images'],
      order: { name: 'ASC' },
    });
    return articles.map((a) => this.enrichArticle(a));
  }

  async findOne(id: string): Promise<Article> {
    const a = await this.articleRepo.findOne({
      where: { id },
      relations: ['brand', 'category', 'tax', 'variants', 'variants.color', 'variants.size', 'variants.flavor', 'variants.prices', 'variants.measureUnit', 'variants.batches', 'variants.barcodes', 'images'],
    });
    if (!a) throw new NotFoundException('Artículo no encontrado');
    return this.enrichArticle(a);
  }

  private enrichArticle(a: Article): Article {
    const article = { ...a };
    if (article.variants) {
      article.variants = article.variants.map((v) => {
        const batchSum = (v.batches || []).reduce(
          (sum, b) => sum + Number(b.currentStock || 0),
          0,
        );
        return {
          ...v,
          totalStock: (v.batches?.length ? batchSum : Number(v.stockActual || 0)) as number,
        } as ArticleVariant & { totalStock: number };
      });
    }
    if (article.images) {
      article.images = [...article.images].sort(
        (a2, b) =>
          (a2.created_at ? new Date(a2.created_at).getTime() : 0) -
          (b.created_at ? new Date(b.created_at).getTime() : 0),
      );
    }
    return article;
  }

  /**
   * Guarda únicamente los datos generales del artículo (pestaña General).
   * Creación o actualización parcial sin datos de variantes.
   * Validación estricta: categoryId, code, name, taxId obligatorios.
   */
  async saveArticleGeneral(
    companyId: string,
    articleId: string | null,
    dto: SaveArticleGeneralDto,
  ): Promise<Article> {
    const codeTrimmed = dto.code?.trim();
    const nameTrimmed = dto.name?.trim();
    if (!codeTrimmed) throw new ConflictException('El código maestro es obligatorio');
    if (!nameTrimmed) throw new ConflictException('El nombre base es obligatorio');
    if (!dto.categoryId) throw new ConflictException('La categoría es obligatoria');
    if (!dto.taxId) throw new ConflictException('El IVA es obligatorio');

    if (articleId) {
      return this.updateArticleGeneral(articleId, companyId, dto);
    }
    return this.createArticleGeneral(companyId, dto);
  }

  private async createArticleGeneral(
    companyId: string,
    dto: SaveArticleGeneralDto,
  ): Promise<Article> {
    await this.companiesService.assertResourceLimit(companyId, 'max_inventory_items', 'artículos');
    const codeTrimmed = dto.code.trim();
    const existingCode = await this.articleRepo.findOne({ where: { companyId, code: codeTrimmed } });
    if (existingCode) {
      throw new ConflictException('Ya existe un artículo con ese código en esta empresa');
    }
    const article = this.articleRepo.create({
      code: codeTrimmed,
      name: dto.name.trim(),
      brandId: dto.brandId || null,
      categoryId: dto.categoryId,
      taxId: dto.taxId,
      companyId,
      observations: dto.observations?.trim() || null,
    });
    const saved = await this.articleRepo.save(article);
    return this.findOne(saved.id);
  }

  private async updateArticleGeneral(
    id: string,
    companyId: string,
    dto: SaveArticleGeneralDto,
  ): Promise<Article> {
    const article = await this.articleRepo.findOne({ where: { id, companyId } });
    if (!article) throw new NotFoundException('Artículo no encontrado');
    const codeTrimmed = dto.code.trim();
    const existingCode = await this.articleRepo.findOne({ where: { companyId, code: codeTrimmed } });
    if (existingCode && existingCode.id !== id) {
      throw new ConflictException('Ya existe un artículo con ese código en esta empresa');
    }
    article.code = codeTrimmed;
    article.name = dto.name.trim();
    article.brandId = dto.brandId || null;
    article.categoryId = dto.categoryId;
    article.taxId = dto.taxId;
    article.observations = dto.observations?.trim() || null;
    await this.articleRepo.save(article);
    return this.findOne(id);
  }

  async create(companyId: string, dto: CreateArticleDto): Promise<Article> {
    await this.companiesService.assertResourceLimit(companyId, 'max_inventory_items', 'artículos');

    const codeTrimmed = dto.code?.trim();
    if (!codeTrimmed) {
      throw new ConflictException('El código maestro es obligatorio');
    }
    const existingCode = await this.articleRepo.findOne({
      where: { companyId, code: codeTrimmed },
    });
    if (existingCode) {
      throw new ConflictException('Ya existe un artículo con ese código en esta empresa');
    }

    const article = this.articleRepo.create({
      code: codeTrimmed,
      name: dto.name.trim(),
      brandId: dto.brandId || null,
      categoryId: dto.categoryId || null,
      taxId: dto.taxId || null,
      companyId,
      observations: dto.observations?.trim() || null,
    });
    const saved = await this.articleRepo.save(article);

    /** General tab only: no variant data in create. Variants are created per-item via POST /articles/:articleId/variants. */

    return this.findOne(saved.id);
  }

  async update(id: string, companyId: string, dto: UpdateArticleDto): Promise<Article> {
    const article = await this.articleRepo.findOne({ where: { id, companyId } });
    if (!article) throw new NotFoundException('Artículo no encontrado');

    if (dto.code != null) {
      const codeTrimmed = dto.code.trim();
      if (codeTrimmed) {
        const existingCode = await this.articleRepo.findOne({
          where: { companyId, code: codeTrimmed },
        });
        if (existingCode && existingCode.id !== id) {
          throw new ConflictException('Ya existe un artículo con ese código en esta empresa');
        }
        article.code = codeTrimmed;
      } else {
        article.code = null;
      }
    }
    if (dto.name != null) article.name = dto.name.trim();
    if (dto.brandId !== undefined) article.brandId = dto.brandId || null;
    if (dto.categoryId !== undefined) article.categoryId = dto.categoryId || null;
    if (dto.taxId !== undefined) article.taxId = dto.taxId || null;
    if (dto.observations !== undefined) article.observations = dto.observations?.trim() || null;

    await this.articleRepo.save(article);

    if (dto.variants?.length) {
      const existing = await this.variantRepo.find({ where: { articleId: id } });
      const toRemove = existing.filter((e) => !dto.variants!.some((v: { sku?: string }) => v.sku === e.sku));
      for (const v of toRemove) await this.variantRepo.remove(v);

      for (const vdto of dto.variants) {
        const existingV = existing.find((e) => e.sku === vdto.sku);
        if (existingV) {
          if (article.code) existingV.articleCode = article.code;
          existingV.barcode = vdto.barcode?.trim() || null;
          existingV.cost = vdto.cost ?? existingV.cost;
          existingV.colorId = vdto.colorId ?? existingV.colorId;
          existingV.sizeId = vdto.sizeId ?? existingV.sizeId;
          existingV.flavorId = vdto.flavorId ?? existingV.flavorId;
          existingV.measureId = vdto.measureId ?? existingV.measureId;
          existingV.stockActual = vdto.stockActual ?? existingV.stockActual;
          existingV.stockMin = vdto.stockMin ?? existingV.stockMin;
          existingV.weight = vdto.weight ?? existingV.weight;
          existingV.observations = vdto.observations?.trim() ?? existingV.observations;
          await this.variantRepo.save(existingV);
          const pdto = vdto.prices;
          const existingPrice = await this.priceRepo.findOne({ where: { articleVariantId: existingV.id } });
          if (existingPrice) {
            existingPrice.precioVenta1 = pdto?.precioVenta1 ?? existingPrice.precioVenta1;
            existingPrice.precioVenta2 = pdto?.precioVenta2 ?? existingPrice.precioVenta2;
            existingPrice.precioVenta3 = pdto?.precioVenta3 ?? existingPrice.precioVenta3;
            existingPrice.precioVenta4 = pdto?.precioVenta4 ?? existingPrice.precioVenta4;
            existingPrice.precioVenta5 = pdto?.precioVenta5 ?? existingPrice.precioVenta5;
            existingPrice.pvp1 = pdto?.pvp1 ?? existingPrice.pvp1;
            existingPrice.pvp2 = pdto?.pvp2 ?? existingPrice.pvp2;
            existingPrice.pvp3 = pdto?.pvp3 ?? existingPrice.pvp3;
            existingPrice.pvp4 = pdto?.pvp4 ?? existingPrice.pvp4;
            existingPrice.pvp5 = pdto?.pvp5 ?? existingPrice.pvp5;
            await this.priceRepo.save(existingPrice);
          } else {
            const newPrice = this.priceRepo.create({
              articleVariantId: existingV.id,
              precioVenta1: pdto?.precioVenta1 ?? 0,
              precioVenta2: pdto?.precioVenta2 ?? 0,
              precioVenta3: pdto?.precioVenta3 ?? 0,
              precioVenta4: pdto?.precioVenta4 ?? 0,
              precioVenta5: pdto?.precioVenta5 ?? 0,
              pvp1: pdto?.pvp1 ?? 0,
              pvp2: pdto?.pvp2 ?? 0,
              pvp3: pdto?.pvp3 ?? 0,
              pvp4: pdto?.pvp4 ?? 0,
              pvp5: pdto?.pvp5 ?? 0,
            });
            await this.priceRepo.save(newPrice);
          }
        } else {
          const variant = this.variantRepo.create({
            articleId: id,
            companyId,
            articleCode: article.code || null,
            sku: vdto.sku.trim(),
            barcode: vdto.barcode?.trim() || null,
            cost: vdto.cost ?? 0,
            colorId: vdto.colorId || null,
            sizeId: vdto.sizeId || null,
            flavorId: vdto.flavorId || null,
            measureId: vdto.measureId || null,
            stockActual: vdto.stockActual ?? 0,
            stockMin: vdto.stockMin ?? 0,
            weight: vdto.weight ?? 0,
            observations: vdto.observations?.trim() || null,
          });
          const savedV = await this.variantRepo.save(variant);
          const pdto = vdto.prices;
          const newPrice = this.priceRepo.create({
            articleVariantId: savedV.id,
            precioVenta1: pdto?.precioVenta1 ?? 0,
            precioVenta2: pdto?.precioVenta2 ?? 0,
            precioVenta3: pdto?.precioVenta3 ?? 0,
            precioVenta4: pdto?.precioVenta4 ?? 0,
            precioVenta5: pdto?.precioVenta5 ?? 0,
            pvp1: pdto?.pvp1 ?? 0,
            pvp2: pdto?.pvp2 ?? 0,
            pvp3: pdto?.pvp3 ?? 0,
            pvp4: pdto?.pvp4 ?? 0,
            pvp5: pdto?.pvp5 ?? 0,
          });
          await this.priceRepo.save(newPrice);
        }
      }
    }

    return this.findOne(id);
  }

  /**
   * Crea una variante individual (POST /articles/:articleId/variants).
   * Solo maneja sku, barcode, cost, measureId, articleId y atributos opcionales.
   */
  async createVariant(
    articleId: string,
    companyId: string,
    dto: CreateArticleVariantDto,
  ): Promise<Article> {
    const article = await this.articleRepo.findOne({ where: { id: articleId, companyId } });
    if (!article) throw new NotFoundException('Artículo no encontrado');

    const skuTrimmed = dto.sku?.trim();
    if (!skuTrimmed) throw new ConflictException('El SKU es obligatorio');

    const existingSku = await this.variantRepo.findOne({
      where: { companyId, sku: skuTrimmed },
    });
    if (existingSku) throw new ConflictException('Ya existe una variante con ese SKU en esta empresa');

    const masterBarcode = dto.barcode?.trim() || null;
    if (masterBarcode) {
      const masterOk = await this.isBarcodeAvailable(companyId, masterBarcode);
      if (!masterOk) throw new ConflictException('El código de barras principal ya está asignado a otro artículo o variante');
    }
    const extraBarcodes = dto.barcodes ?? [];
    for (const eb of extraBarcodes) {
      const bc = (eb.barcode ?? '').trim();
      if (!bc) continue;
      const ok = await this.isBarcodeAvailable(companyId, bc);
      if (!ok) throw new ConflictException(`El código de barras "${bc}" ya está asignado a otro artículo o variante`);
    }

    const variant = this.variantRepo.create({
      articleId,
      companyId,
      articleCode: article.code || null,
      sku: skuTrimmed,
      barcode: dto.barcode?.trim() || null,
      cost: dto.cost ?? 0,
      colorId: dto.colorId || null,
      sizeId: dto.sizeId || null,
      flavorId: dto.flavorId || null,
      measureId: dto.measureId || null,
      stockActual: dto.stockActual ?? 0,
      stockMin: dto.stockMin ?? 0,
      weight: dto.weight ?? 0,
      observations: dto.observations?.trim() || null,
    });
    const savedV = await this.variantRepo.save(variant);

    const pdto = dto.prices;
    const price = this.priceRepo.create({
      articleVariantId: savedV.id,
      precioVenta1: pdto?.precioVenta1 ?? 0,
      precioVenta2: pdto?.precioVenta2 ?? 0,
      precioVenta3: pdto?.precioVenta3 ?? 0,
      precioVenta4: pdto?.precioVenta4 ?? 0,
      precioVenta5: pdto?.precioVenta5 ?? 0,
      pvp1: pdto?.pvp1 ?? 0,
      pvp2: pdto?.pvp2 ?? 0,
      pvp3: pdto?.pvp3 ?? 0,
      pvp4: pdto?.pvp4 ?? 0,
      pvp5: pdto?.pvp5 ?? 0,
    });
    await this.priceRepo.save(price);

    for (const eb of extraBarcodes) {
      const bc = (eb.barcode ?? '').trim();
      if (!bc) continue;
      const barcodeRow = this.barcodeRepo.create({
        articleVariantId: savedV.id,
        barcode: bc,
        description: (eb.description ?? '').trim() || null,
      });
      await this.barcodeRepo.save(barcodeRow);
    }

    return this.findOne(articleId);
  }

  /**
   * Actualiza una variante individual (PATCH /articles/variants/:variantId).
   */
  async updateVariant(
    variantId: string,
    companyId: string,
    dto: Partial<CreateArticleVariantDto>,
  ): Promise<Article> {
    const variant = await this.variantRepo.findOne({ where: { id: variantId, companyId }, relations: ['article'] });
    if (!variant) throw new NotFoundException('Variante no encontrada');

    if (dto.sku != null && dto.sku.trim()) {
      const skuTrimmed = dto.sku.trim();
      const existingSku = await this.variantRepo.findOne({ where: { companyId, sku: skuTrimmed } });
      if (existingSku && existingSku.id !== variantId) {
        throw new ConflictException('Ya existe una variante con ese SKU en esta empresa');
      }
      variant.sku = skuTrimmed;
    }
    if (dto.barcode !== undefined) {
      const newMaster = dto.barcode?.trim() || null;
      if (newMaster) {
        const masterOk = await this.isBarcodeAvailable(companyId, newMaster, variantId);
        if (!masterOk) throw new ConflictException('El código de barras principal ya está asignado a otro artículo o variante');
      }
      variant.barcode = newMaster;
    }
    if (dto.cost != null) variant.cost = dto.cost;
    if (dto.colorId !== undefined) variant.colorId = dto.colorId || null;
    if (dto.sizeId !== undefined) variant.sizeId = dto.sizeId || null;
    if (dto.flavorId !== undefined) variant.flavorId = dto.flavorId || null;
    if (dto.measureId !== undefined) variant.measureId = dto.measureId || null;
    if (dto.stockActual != null) variant.stockActual = dto.stockActual;
    if (dto.stockMin != null) variant.stockMin = dto.stockMin;
    if (dto.weight != null) variant.weight = dto.weight;
    if (dto.observations !== undefined) variant.observations = dto.observations?.trim() || null;
    if (variant.article?.code) variant.articleCode = variant.article.code;

    await this.variantRepo.save(variant);

    if (dto.barcodes !== undefined) {
      const extraBarcodes = dto.barcodes ?? [];
      for (const eb of extraBarcodes) {
        const bc = (eb.barcode ?? '').trim();
        if (!bc) continue;
        const ok = await this.isBarcodeAvailable(companyId, bc, variantId);
        if (!ok) throw new ConflictException(`El código de barras "${bc}" ya está asignado a otro artículo o variante`);
      }
      await this.barcodeRepo.delete({ articleVariantId: variantId });
      for (const eb of extraBarcodes) {
        const bc = (eb.barcode ?? '').trim();
        if (!bc) continue;
        const barcodeRow = this.barcodeRepo.create({
          articleVariantId: variantId,
          barcode: bc,
          description: (eb.description ?? '').trim() || null,
        });
        await this.barcodeRepo.save(barcodeRow);
      }
    }

    const pdto = dto.prices;
    if (pdto) {
      const existingPrice = await this.priceRepo.findOne({ where: { articleVariantId: variantId } });
      if (existingPrice) {
        if (pdto.precioVenta1 != null) existingPrice.precioVenta1 = pdto.precioVenta1;
        if (pdto.precioVenta2 != null) existingPrice.precioVenta2 = pdto.precioVenta2;
        if (pdto.precioVenta3 != null) existingPrice.precioVenta3 = pdto.precioVenta3;
        if (pdto.precioVenta4 != null) existingPrice.precioVenta4 = pdto.precioVenta4;
        if (pdto.precioVenta5 != null) existingPrice.precioVenta5 = pdto.precioVenta5;
        if (pdto.pvp1 != null) existingPrice.pvp1 = pdto.pvp1;
        if (pdto.pvp2 != null) existingPrice.pvp2 = pdto.pvp2;
        if (pdto.pvp3 != null) existingPrice.pvp3 = pdto.pvp3;
        if (pdto.pvp4 != null) existingPrice.pvp4 = pdto.pvp4;
        if (pdto.pvp5 != null) existingPrice.pvp5 = pdto.pvp5;
        await this.priceRepo.save(existingPrice);
      }
    }

    return this.findOne(variant.articleId);
  }

  /**
   * Actualiza el costo de una variante y recalcula rentabilidades (trigger BD).
   * Devuelve la fila de precios con rentabilidad1-5 actualizadas.
   */
  async updateVariantCost(
    variantId: string,
    companyId: string,
    cost: number,
  ): Promise<ArticleVariantPrice> {
    const variant = await this.variantRepo.findOne({ where: { id: variantId, companyId } });
    if (!variant) throw new NotFoundException('Variante no encontrada');
    variant.cost = cost;
    await this.variantRepo.save(variant);
    return this.recalculatePrices(variantId, companyId);
  }

  /**
   * Recalcula rentabilidades disparando el trigger de BD (save sin cambiar precios).
   * Útil cuando el costo de la variante cambia.
   */
  async recalculatePrices(variantId: string, companyId: string): Promise<ArticleVariantPrice> {
    const variant = await this.variantRepo.findOne({ where: { id: variantId, companyId } });
    if (!variant) throw new NotFoundException('Variante no encontrada');
    const price = await this.priceRepo.findOne({ where: { articleVariantId: variantId } });
    if (!price) throw new NotFoundException('No hay precios para esta variante');
    await this.priceRepo.save(price);
    return this.priceRepo.findOneOrFail({
      where: { id: price.id },
    });
  }

  async remove(id: string, companyId: string): Promise<void> {
    const article = await this.articleRepo.findOne({ where: { id, companyId } });
    if (!article) throw new NotFoundException('Artículo no encontrado');
    await this.articleRepo.remove(article);
  }

  // --- Images ---
  async addImage(articleId: string, companyId: string, url: string, isMain = false): Promise<ArticleImage> {
    const article = await this.articleRepo.findOne({ where: { id: articleId, companyId } });
    if (!article) throw new NotFoundException('Artículo no encontrado');
    if (isMain) {
      await this.imageRepo.update({ articleId }, { isMain: false });
    }
    const img = this.imageRepo.create({
      articleId,
      url,
      isMain,
    });
    return this.imageRepo.save(img);
  }

  async setMainImage(articleId: string, companyId: string, imageId: string): Promise<void> {
    const article = await this.articleRepo.findOne({ where: { id: articleId, companyId } });
    if (!article) throw new NotFoundException('Artículo no encontrado');
    const img = await this.imageRepo.findOne({ where: { id: imageId, articleId } });
    if (!img) throw new NotFoundException('Imagen no encontrada');
    await this.imageRepo.update({ articleId }, { isMain: false });
    await this.imageRepo.update({ id: imageId }, { isMain: true });
  }

  async removeImage(articleId: string, companyId: string, imageId: string): Promise<void> {
    const article = await this.articleRepo.findOne({ where: { id: articleId, companyId } });
    if (!article) throw new NotFoundException('Artículo no encontrado');
    const img = await this.imageRepo.findOne({ where: { id: imageId, articleId } });
    if (!img) throw new NotFoundException('Imagen no encontrada');
    await this.imageRepo.remove(img);
  }

  // --- Batches ---
  async addBatch(variantId: string, companyId: string, dto: CreateBatchDto): Promise<ArticleVariantBatch> {
    const variant = await this.variantRepo.findOne({
      where: { id: variantId, companyId },
      relations: ['article'],
    });
    if (!variant) throw new NotFoundException('Variante no encontrada');
    const batch = this.batchRepo.create({
      articleVariantId: variantId,
      batchNumber: dto.batchNumber.trim(),
      expirationDate: dto.expirationDate ? new Date(dto.expirationDate) : null,
      currentStock: dto.currentStock ?? 0,
      companyId,
    });
    return this.batchRepo.save(batch);
  }

  async updateBatch(
    variantId: string,
    companyId: string,
    batchId: string,
    dto: UpdateBatchDto,
  ): Promise<ArticleVariantBatch> {
    const variant = await this.variantRepo.findOne({ where: { id: variantId, companyId } });
    if (!variant) throw new NotFoundException('Variante no encontrada');
    const batch = await this.batchRepo.findOne({ where: { id: batchId, articleVariantId: variantId } });
    if (!batch) throw new NotFoundException('Lote no encontrado');
    if (dto.batchNumber != null) batch.batchNumber = dto.batchNumber.trim();
    if (dto.expirationDate !== undefined) batch.expirationDate = dto.expirationDate ? new Date(dto.expirationDate) : null;
    if (dto.currentStock != null) batch.currentStock = dto.currentStock;
    return this.batchRepo.save(batch);
  }

  async removeBatch(variantId: string, companyId: string, batchId: string): Promise<void> {
    const variant = await this.variantRepo.findOne({ where: { id: variantId, companyId } });
    if (!variant) throw new NotFoundException('Variante no encontrada');
    const batch = await this.batchRepo.findOne({ where: { id: batchId, articleVariantId: variantId } });
    if (!batch) throw new NotFoundException('Lote no encontrado');
    await this.batchRepo.remove(batch);
  }
}
