import { Controller, Get, Post, Body, Patch, Param } from '@nestjs/common';
import { WarehousesService } from './warehouses.service';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';

@Controller('warehouses')
export class WarehousesController {
  constructor(private readonly warehousesService: WarehousesService) {}

  @Post('establishment/:establishmentId')
  create(
    @Param('establishmentId') establishmentId: string,
    @Body() dto: CreateWarehouseDto,
  ) {
    return this.warehousesService.create(establishmentId, dto);
  }

  @Get('establishment/:establishmentId')
  findAllByEstablishment(@Param('establishmentId') establishmentId: string) {
    return this.warehousesService.findAllByEstablishment(establishmentId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateWarehouseDto) {
    return this.warehousesService.update(id, dto);
  }
}
