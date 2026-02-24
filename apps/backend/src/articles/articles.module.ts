import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompaniesModule } from '../companies/companies.module';
import { ModuleEnabledGuard } from '../common/guards/module-enabled.guard';
import { ArticlesController } from './articles.controller';
import { ArticlesService } from './articles.service';
import { BrandsService } from './brands.service';
import { CategoriesService } from './categories.service';
import { Article } from './entities/article.entity';
import { ArticleVariant } from './entities/article-variant.entity';
import { ArticleVariantPrice } from './entities/article-variant-price.entity';
import { ArticleImage } from './entities/article-image.entity';
import { ArticleVariantBatch } from './entities/article-variant-batch.entity';
import { Brand } from './entities/brand.entity';
import { Category } from './entities/category.entity';
import { Measure } from './entities/measure.entity';
import { Color } from './entities/color.entity';
import { Size } from './entities/size.entity';
import { Flavor } from './entities/flavor.entity';
import { MeasuresService } from './measures.service';
import { ColorsService } from './colors.service';
import { SizesService } from './sizes.service';
import { FlavorsService } from './flavors.service';
import { CatalogsController } from './catalogs.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Article,
      ArticleVariant,
      ArticleVariantPrice,
      ArticleImage,
      ArticleVariantBatch,
      Brand,
      Category,
      Measure,
      Color,
      Size,
      Flavor,
    ]),
    CompaniesModule,
  ],
  controllers: [ArticlesController, CatalogsController],
  providers: [
    ArticlesService,
    BrandsService,
    CategoriesService,
    MeasuresService,
    ColorsService,
    SizesService,
    FlavorsService,
    ModuleEnabledGuard,
  ],
  exports: [
    ArticlesService,
    BrandsService,
    CategoriesService,
    MeasuresService,
    ColorsService,
    SizesService,
    FlavorsService,
  ],
})
export class ArticlesModule {}
