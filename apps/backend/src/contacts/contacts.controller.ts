import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Delete,
  Param,
  Query,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ContactsService } from './contacts.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { SearchContactDto } from './dto/search-contact.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ContactsModuleGuard } from '../common/guards/contacts-module.guard';
import { RoleGuard } from '../common/guards/role.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';

@ApiTags('contacts')
@Controller('contacts')
@UseGuards(JwtAuthGuard, ContactsModuleGuard, RoleGuard)
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Post('company/:companyId')
  @RequirePermission('contacts', 'edit')
  create(
    @Param('companyId') companyId: string,
    @Body() dto: CreateContactDto,
  ) {
    return this.contactsService.create(companyId, dto);
  }

  @Get('company/:companyId')
  findAll(
    @Param('companyId') companyId: string,
    @Query() query: SearchContactDto,
  ) {
    const type = query.type ?? 'all';
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    return this.contactsService.findAll(companyId, type, query.search, page, limit);
  }

  @Get('company/:companyId/lookup')
  async lookupByTaxId(
    @Param('companyId') companyId: string,
    @Query('taxId') taxId: string,
  ) {
    const contact = await this.contactsService.findByTaxId(companyId, taxId ?? '');
    if (!contact) {
      throw new NotFoundException('Contacto no encontrado');
    }
    return contact;
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.contactsService.findOne(id);
  }

  @Patch(':id/activate')
  @RequirePermission('contacts', 'edit')
  activate(@Param('id') id: string) {
    return this.contactsService.activate(id);
  }

  @Patch(':id')
  @RequirePermission('contacts', 'edit')
  update(@Param('id') id: string, @Body() dto: UpdateContactDto) {
    return this.contactsService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermission('contacts', 'delete')
  remove(@Param('id') id: string) {
    return this.contactsService.remove(id);
  }
}
