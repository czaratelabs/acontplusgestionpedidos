import { Controller, Get, Post, Body, Patch, Param } from '@nestjs/common';
import { EmissionPointsService } from './emission-points.service';
import { CreateEmissionPointDto } from './dto/create-emission-point.dto';
import { UpdateEmissionPointDto } from './dto/update-emission-point.dto';

@Controller('emission-points')
export class EmissionPointsController {
  constructor(private readonly emissionPointsService: EmissionPointsService) {}

  @Post('establishment/:establishmentId')
  create(@Param('establishmentId') establishmentId: string, @Body() dto: CreateEmissionPointDto) {
    return this.emissionPointsService.create(establishmentId, dto);
  }

  @Get('establishment/:establishmentId')
  findAll(@Param('establishmentId') establishmentId: string) {
    return this.emissionPointsService.findAllByEstablishment(establishmentId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateEmissionPointDto) {
    return this.emissionPointsService.update(id, dto);
  }
}