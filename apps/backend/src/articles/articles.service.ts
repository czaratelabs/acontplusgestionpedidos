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
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { CreateBatchDto } from './dto/create-batch.dto';
import { UpdateBatchDto } from './dto/update-batch.dto';

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
  ) {}

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
      .leftJoinAndSelect('v.color', 'vcolor')
      .leftJoinAndSelect('v.size', 'vsize')
      .leftJoinAndSelect('v.flavor', 'vflavor')
      .leftJoinAndSelect('a.brand', 'b')
      .leftJoinAndSelect('a.category', 'c')
      .leftJoinAndSelect('a.tax', 't')
      .where('v.company_id = :companyId', { companyId })
      .andWhere('v.is_active = true')
      .andWhere(
        new Brackets((qb) => {
          qb.where('LOWER(v.barcode) = LOWER(:q)', { q: trimmed })
            .orWhere('LOWER(v.sku) = LOWER(:q)', { q: trimmed })
            .orWhere("a.search_vector @@ plainto_tsquery('spanish', :q)", { q: trimmed });
        }),
      )
      .getOne();

    return variant;
  }

  async findAll(companyId: string): Promise<Article[]> {
    const articles = await this.articleRepo.find({
      where: { companyId },
      relations: ['brand', 'category', 'tax', 'variants', 'variants.color', 'variants.size', 'variants.flavor', 'variants.prices', 'variants.prices.unit', 'variants.measureUnit', 'variants.batches', 'images'],
      order: { name: 'ASC' },
    });
    return articles.map((a) => this.enrichArticle(a));
  }

  async findOne(id: string): Promise<Article> {
    const a = await this.articleRepo.findOne({
      where: { id },
      relations: ['brand', 'category', 'tax', 'variants', 'variants.color', 'variants.size', 'variants.flavor', 'variants.prices', 'variants.prices.unit', 'variants.measureUnit', 'variants.batches', 'images'],
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

  async create(companyId: string, dto: CreateArticleDto): Promise<Article> {
    if (!dto.variants?.length) {
      throw new ConflictException('Debe incluir al menos una variante');
    }

    const article = this.articleRepo.create({
      name: dto.name.trim(),
      brandId: dto.brandId || null,
      categoryId: dto.categoryId || null,
      taxId: dto.taxId || null,
      companyId,
      observations: dto.observations?.trim() || null,
    });
    const saved = await this.articleRepo.save(article);

    for (const vdto of dto.variants) {
      const variant = this.variantRepo.create({
        articleId: saved.id,
        companyId,
        sku: vdto.sku.trim(),
        barcode: vdto.barcode?.trim() || null,
        cost: vdto.cost ?? 0,
        colorId: vdto.colorId || null,
        sizeId: vdto.sizeId || null,
        flavorId: vdto.flavorId || null,
        measure: vdto.measure?.trim() || null,
        measureId: vdto.measureId || null,
        stockActual: vdto.stockActual ?? 0,
        stockMin: vdto.stockMin ?? 0,
        observations: vdto.observations?.trim() || null,
      });
      const savedV = await this.variantRepo.save(variant);

      if (vdto.prices?.length) {
        for (const pdto of vdto.prices) {
          const price = this.priceRepo.create({
            articleVariantId: savedV.id,
            priceType: pdto.priceType.trim(),
            price: pdto.price,
            isDefault: pdto.isDefault ?? false,
            unitId: pdto.unitId || null,
          });
          await this.priceRepo.save(price);
        }
      }
    }

    return this.findOne(saved.id);
  }

  async update(id: string, companyId: string, dto: UpdateArticleDto): Promise<Article> {
    const article = await this.articleRepo.findOne({ where: { id, companyId } });
    if (!article) throw new NotFoundException('Artículo no encontrado');

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
          existingV.barcode = vdto.barcode?.trim() || null;
          existingV.cost = vdto.cost ?? existingV.cost;
          existingV.colorId = vdto.colorId ?? existingV.colorId;
          existingV.sizeId = vdto.sizeId ?? existingV.sizeId;
          existingV.flavorId = vdto.flavorId ?? existingV.flavorId;
          existingV.measure = vdto.measure?.trim() ?? existingV.measure;
          existingV.measureId = vdto.measureId ?? existingV.measureId;
          existingV.stockActual = vdto.stockActual ?? existingV.stockActual;
          existingV.stockMin = vdto.stockMin ?? existingV.stockMin;
          existingV.observations = vdto.observations?.trim() ?? existingV.observations;
          await this.variantRepo.save(existingV);
          if (vdto.prices?.length) {
            await this.priceRepo.delete({ articleVariantId: existingV.id });
            for (const pdto of vdto.prices) {
              await this.priceRepo.save(
                this.priceRepo.create({
                  articleVariantId: existingV.id,
                  priceType: pdto.priceType.trim(),
                  price: pdto.price,
                  isDefault: pdto.isDefault ?? false,
                  unitId: pdto.unitId || null,
                }),
              );
            }
          }
        } else {
          const variant = this.variantRepo.create({
            articleId: id,
            companyId,
            sku: vdto.sku.trim(),
            barcode: vdto.barcode?.trim() || null,
            cost: vdto.cost ?? 0,
            colorId: vdto.colorId || null,
            sizeId: vdto.sizeId || null,
            flavorId: vdto.flavorId || null,
            measure: vdto.measure?.trim() || null,
            measureId: vdto.measureId || null,
            stockActual: vdto.stockActual ?? 0,
            stockMin: vdto.stockMin ?? 0,
            observations: vdto.observations?.trim() || null,
          });
          const savedV = await this.variantRepo.save(variant);
          if (vdto.prices?.length) {
            for (const pdto of vdto.prices) {
              await this.priceRepo.save(
                this.priceRepo.create({
                  articleVariantId: savedV.id,
                  priceType: pdto.priceType.trim(),
                  price: pdto.price,
                  isDefault: pdto.isDefault ?? false,
                  unitId: pdto.unitId || null,
                }),
              );
            }
          }
        }
      }
    }

    return this.findOne(id);
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
