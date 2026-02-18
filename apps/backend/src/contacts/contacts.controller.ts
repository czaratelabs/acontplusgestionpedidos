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
} from '@nestjs/common';
import { ContactsService } from './contacts.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { SearchContactDto } from './dto/search-contact.dto';

@Controller('contacts')
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Post('company/:companyId')
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
    return this.contactsService.findAll(companyId, type, query.search);
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
  activate(@Param('id') id: string) {
    return this.contactsService.activate(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateContactDto) {
    return this.contactsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.contactsService.remove(id);
  }
}
