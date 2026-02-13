import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Company } from '../companies/entities/company.entity'; // Asegúrate que la ruta sea correcta

@Module({
  imports: [TypeOrmModule.forFeature([User, Company])], // <--- ¡AQUÍ ESTÁ LA CLAVE!
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService], // <--- AGREGA ESTO
})
export class UsersModule {}