import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Delete,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage, Multer } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { ArticlesService } from './articles.service';
import { BrandsService } from './brands.service';
import { CategoriesService } from './categories.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { CreateBatchDto } from './dto/create-batch.dto';
import { UpdateBatchDto } from './dto/update-batch.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ModuleEnabledGuard } from '../common/guards/module-enabled.guard';
import { ModuleEnabled } from '../common/decorators/module-enabled.decorator';

@Controller('articles')
@UseGuards(JwtAuthGuard, ModuleEnabledGuard)
@ModuleEnabled('logistics')
export class ArticlesController {
  constructor(
    private readonly articlesService: ArticlesService,
    private readonly brandsService: BrandsService,
    private readonly categoriesService: CategoriesService,
  ) {}

  @Get('company/:companyId/search')
  searchVariant(
    @Param('companyId') companyId: string,
    @Query('q') q: string,
  ) {
    return this.articlesService.searchVariant(companyId, q ?? '');
  }

  @Get('company/:companyId')
  findAll(@Param('companyId') companyId: string) {
    return this.articlesService.findAll(companyId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.articlesService.findOne(id);
  }

  @Post('company/:companyId')
  create(
    @Param('companyId') companyId: string,
    @Body() dto: CreateArticleDto,
  ) {
    return this.articlesService.create(companyId, dto);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Query('companyId') companyId: string,
    @Body() dto: UpdateArticleDto,
  ) {
    return this.articlesService.update(id, companyId ?? '', dto);
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @Query('companyId') companyId: string,
  ) {
    return this.articlesService.remove(id, companyId ?? '');
  }

  // --- Images ---
  @Post(':id/images')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/articles',
        filename: (req, file, cb) => {
          const ext = extname(file.originalname) || '.jpg';
          cb(null, `${uuidv4()}${ext}`);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
      fileFilter: (req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (allowed.includes(file.mimetype)) cb(null, true);
        else cb(new BadRequestException('Tipo de archivo no permitido'), false);
      },
    }),
  )
  uploadImage(
    @Param('id') articleId: string,
    @Query('companyId') companyId: string,
    @Query('isMain') isMain: string,
    @UploadedFile() file: Multer.File,
  ) {
    if (!file) throw new BadRequestException('No se recibió archivo');
    const url = `/uploads/articles/${file.filename}`;
    return this.articlesService.addImage(articleId, companyId ?? '', url, isMain === 'true');
  }

  @Patch(':id/images/:imageId/main')
  setMainImage(
    @Param('id') articleId: string,
    @Param('imageId') imageId: string,
    @Query('companyId') companyId: string,
  ) {
    return this.articlesService.setMainImage(articleId, companyId ?? '', imageId);
  }

  @Delete(':id/images/:imageId')
  removeImage(
    @Param('id') articleId: string,
    @Param('imageId') imageId: string,
    @Query('companyId') companyId: string,
  ) {
    return this.articlesService.removeImage(articleId, companyId ?? '', imageId);
  }

  // --- Batches ---
  @Post('variants/:variantId/batches')
  addBatch(
    @Param('variantId') variantId: string,
    @Query('companyId') companyId: string,
    @Body() dto: CreateBatchDto,
  ) {
    return this.articlesService.addBatch(variantId, companyId ?? '', dto);
  }

  @Patch('variants/:variantId/batches/:batchId')
  updateBatch(
    @Param('variantId') variantId: string,
    @Param('batchId') batchId: string,
    @Query('companyId') companyId: string,
    @Body() dto: UpdateBatchDto,
  ) {
    return this.articlesService.updateBatch(variantId, companyId ?? '', batchId, dto);
  }

  @Delete('variants/:variantId/batches/:batchId')
  removeBatch(
    @Param('variantId') variantId: string,
    @Param('batchId') batchId: string,
    @Query('companyId') companyId: string,
  ) {
    return this.articlesService.removeBatch(variantId, companyId ?? '', batchId);
  }
}
