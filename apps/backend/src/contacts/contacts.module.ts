import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContactsService } from './contacts.service';
import { ContactsController } from './contacts.controller';
import { Contact } from './entities/contact.entity';
import { Company } from '../companies/entities/company.entity';
import { CompaniesModule } from '../companies/companies.module';
import { ContactsModuleGuard } from '../common/guards/contacts-module.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Contact, Company]), CompaniesModule],
  controllers: [ContactsController],
  providers: [ContactsService, ContactsModuleGuard],
  exports: [ContactsService],
})
export class ContactsModule {}
