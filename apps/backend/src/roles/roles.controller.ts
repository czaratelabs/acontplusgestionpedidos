import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { ModuleEnabledGuard } from '../common/guards/module-enabled.guard';
import { ModuleEnabled } from '../common/decorators/module-enabled.decorator';

@Controller('roles')
@UseGuards(JwtAuthGuard, ModuleEnabledGuard)
@ModuleEnabled('admin_roles')
export class RolesController {
  constructor(private readonly service: RolesService) {}

  @Get()
  findAll(@Query('companyId') companyId?: string) {
    return this.service.findAll(companyId?.trim() || undefined);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @UseGuards(AdminGuard)
  create(@Body() dto: CreateRoleDto) {
    return this.service.create(dto);
  }

  @Patch(':id/activate')
  @UseGuards(AdminGuard)
  activate(@Param('id') id: string) {
    return this.service.activate(id);
  }

  @Patch(':id')
  @UseGuards(AdminGuard)
  update(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  async remove(@Param('id') id: string) {
    await this.service.remove(id);
    return { message: 'Rol eliminado correctamente' };
  }
}
