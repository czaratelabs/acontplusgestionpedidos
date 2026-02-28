import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BrandsService } from './brands.service';
import { CategoriesService } from './categories.service';
import { MeasuresService } from './measures.service';
import { ColorsService } from './colors.service';
import { SizesService } from './sizes.service';
import { FlavorsService } from './flavors.service';

@Controller('articles/catalogs')
@UseGuards(JwtAuthGuard)
export class CatalogsController {
  constructor(
    private readonly brandsService: BrandsService,
    private readonly categoriesService: CategoriesService,
    private readonly measuresService: MeasuresService,
    private readonly colorsService: ColorsService,
    private readonly sizesService: SizesService,
    private readonly flavorsService: FlavorsService,
  ) {}

  // Brands
  @Get('company/:companyId/brands')
  getBrands(@Param('companyId') companyId: string) {
    return this.brandsService.findByCompany(companyId);
  }

  @Post('company/:companyId/brands')
  createBrand(
    @Param('companyId') companyId: string,
    @Body('name') name: string,
  ) {
    return this.brandsService.create(companyId, name ?? '');
  }

  @Patch('company/:companyId/brands/:id')
  updateBrand(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body('name') name: string,
  ) {
    return this.brandsService.update(id, companyId, name ?? '');
  }

  @Delete('company/:companyId/brands/:id')
  removeBrand(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.brandsService.remove(id, companyId);
  }

  // Categories
  @Get('company/:companyId/categories')
  getCategories(@Param('companyId') companyId: string) {
    return this.categoriesService.findByCompany(companyId);
  }

  @Post('company/:companyId/categories')
  createCategory(
    @Param('companyId') companyId: string,
    @Body('name') name: string,
  ) {
    return this.categoriesService.create(companyId, name ?? '');
  }

  @Patch('company/:companyId/categories/:id')
  updateCategory(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body('name') name: string,
  ) {
    return this.categoriesService.update(id, companyId, name ?? '');
  }

  @Delete('company/:companyId/categories/:id')
  removeCategory(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.categoriesService.remove(id, companyId);
  }

  // Measures
  @Get('company/:companyId/measures')
  getMeasures(@Param('companyId') companyId: string) {
    return this.measuresService.findByCompany(companyId);
  }

  @Post('company/:companyId/measures')
  createMeasure(
    @Param('companyId') companyId: string,
    @Body('name') name: string,
  ) {
    return this.measuresService.create(companyId, name ?? '');
  }

  @Patch('company/:companyId/measures/:id')
  updateMeasure(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body('name') name: string,
  ) {
    return this.measuresService.update(id, companyId, name ?? '');
  }

  @Delete('company/:companyId/measures/:id')
  removeMeasure(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.measuresService.remove(id, companyId);
  }

  // Colors
  @Get('company/:companyId/colors')
  getColors(@Param('companyId') companyId: string) {
    return this.colorsService.findByCompany(companyId);
  }

  @Post('company/:companyId/colors')
  createColor(
    @Param('companyId') companyId: string,
    @Body('name') name: string,
  ) {
    return this.colorsService.create(companyId, name ?? '');
  }

  @Patch('company/:companyId/colors/:id')
  updateColor(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body('name') name: string,
  ) {
    return this.colorsService.update(id, companyId, name ?? '');
  }

  @Delete('company/:companyId/colors/:id')
  removeColor(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.colorsService.remove(id, companyId);
  }

  // Sizes
  @Get('company/:companyId/sizes')
  getSizes(@Param('companyId') companyId: string) {
    return this.sizesService.findByCompany(companyId);
  }

  @Post('company/:companyId/sizes')
  createSize(
    @Param('companyId') companyId: string,
    @Body('name') name: string,
  ) {
    return this.sizesService.create(companyId, name ?? '');
  }

  @Patch('company/:companyId/sizes/:id')
  updateSize(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body('name') name: string,
  ) {
    return this.sizesService.update(id, companyId, name ?? '');
  }

  @Delete('company/:companyId/sizes/:id')
  removeSize(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.sizesService.remove(id, companyId);
  }

  // Flavors
  @Get('company/:companyId/flavors')
  getFlavors(@Param('companyId') companyId: string) {
    return this.flavorsService.findByCompany(companyId);
  }

  @Post('company/:companyId/flavors')
  createFlavor(
    @Param('companyId') companyId: string,
    @Body('name') name: string,
  ) {
    return this.flavorsService.create(companyId, name ?? '');
  }

  @Patch('company/:companyId/flavors/:id')
  updateFlavor(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body('name') name: string,
  ) {
    return this.flavorsService.update(id, companyId, name ?? '');
  }

  @Delete('company/:companyId/flavors/:id')
  removeFlavor(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.flavorsService.remove(id, companyId);
  }
}
