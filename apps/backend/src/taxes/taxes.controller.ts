import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { TaxesService } from './taxes.service';
import { CreateTaxDto } from './dto/create-tax.dto';
import { UpdateTaxDto } from './dto/update-tax.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ModuleEnabledGuard } from '../common/guards/module-enabled.guard';
import { ModuleEnabled } from '../common/decorators/module-enabled.decorator';

@Controller('taxes')
@UseGuards(JwtAuthGuard, ModuleEnabledGuard)
@ModuleEnabled('admin_taxes')
export class TaxesController {
  constructor(private readonly taxesService: TaxesService) {}

  @Post('company/:companyId')
  create(@Param('companyId') companyId: string, @Body() dto: CreateTaxDto) {
    return this.taxesService.create(companyId, dto);
  }

  @Get('company/:companyId')
  findAllByCompany(@Param('companyId') companyId: string) {
    return this.taxesService.findAllByCompany(companyId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.taxesService.findOne(id);
  }

  @Patch(':id/activate')
  activate(@Param('id') id: string) {
    return this.taxesService.activate(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTaxDto) {
    return this.taxesService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.taxesService.remove(id);
  }
}
