import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AssignUserDto } from './dto/assign-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('available-for-company/:companyId')
  @UseGuards(AdminGuard)
  findAvailableForCompany(@Param('companyId') companyId: string) {
    return this.usersService.findAvailableForCompany(companyId);
  }

  @Post('company/:companyId')
  @UseGuards(AdminGuard)
  createEmployee(
    @Param('companyId') companyId: string,
    @Body() createUserDto: CreateUserDto,
  ) {
    return this.usersService.createEmployee(companyId, createUserDto);
  }

  @Get('company/:companyId')
  findAllByCompany(@Param('companyId') companyId: string) {
    return this.usersService.findAllByCompany(companyId);
  }

  @Post('company/:companyId/assign')
  @UseGuards(AdminGuard)
  assignUserToCompany(
    @Param('companyId') companyId: string,
    @Body() dto: AssignUserDto,
  ) {
    return this.usersService.assignUserToCompany(
      companyId,
      dto.userId,
      dto.role,
    );
  }

  @Delete('company/:companyId/user/:userId')
  @UseGuards(AdminGuard)
  async removeUserFromCompany(
    @Param('companyId') companyId: string,
    @Param('userId') userId: string,
  ) {
    await this.usersService.removeUserFromCompany(userId, companyId);
    return { message: 'Usuario removido de la empresa correctamente' };
  }

  @Patch('company/:companyId/user/:userId')
  @UseGuards(AdminGuard)
  updateUserInCompany(
    @Param('companyId') companyId: string,
    @Param('userId') userId: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(userId, { ...dto, companyId });
  }

  @Patch(':id')
  @UseGuards(AdminGuard)
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }
}