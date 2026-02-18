import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { EstablishmentsService } from './establishments.service';
import { CreateEstablishmentDto } from './dto/create-establishment.dto';
import { UpdateEstablishmentDto } from './dto/update-establishment.dto';

@Controller('establishments')
export class EstablishmentsController {
  constructor(private readonly establishmentsService: EstablishmentsService) {}

  @Post('company/:companyId')
  create(@Param('companyId') companyId: string, @Body() dto: CreateEstablishmentDto) {
    return this.establishmentsService.create(companyId, dto);
  }

  @Get('company/:companyId')
  findAll(@Param('companyId') companyId: string) {
    return this.establishmentsService.findAllByCompany(companyId);
  }

  @Patch(':id/activate')
  activate(@Param('id') id: string) {
    return this.establishmentsService.activate(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateEstablishmentDto) {
    return this.establishmentsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.establishmentsService.remove(id);
  }
}