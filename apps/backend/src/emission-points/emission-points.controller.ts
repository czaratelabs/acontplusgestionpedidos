import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { EmissionPointsService } from './emission-points.service';
import { CreateEmissionPointDto } from './dto/create-emission-point.dto';
import { UpdateEmissionPointDto } from './dto/update-emission-point.dto';

@Controller('emission-points')
export class EmissionPointsController {
  constructor(private readonly emissionPointsService: EmissionPointsService) {}

  @Get('company/:companyId/limit-info')
  getLimitInfo(@Param('companyId') companyId: string) {
    return this.emissionPointsService.getEmissionPointLimitInfo(companyId);
  }

  @Post('establishment/:establishmentId')
  create(@Param('establishmentId') establishmentId: string, @Body() dto: CreateEmissionPointDto) {
    return this.emissionPointsService.create(establishmentId, dto);
  }

  @Get('establishment/:establishmentId')
  findAll(@Param('establishmentId') establishmentId: string) {
    return this.emissionPointsService.findAllByEstablishment(establishmentId);
  }

  @Patch(':id/activate')
  activate(@Param('id') id: string) {
    return this.emissionPointsService.activate(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateEmissionPointDto) {
    return this.emissionPointsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.emissionPointsService.remove(id);
  }
}