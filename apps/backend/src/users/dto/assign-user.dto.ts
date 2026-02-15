import { IsString, IsNotEmpty } from 'class-validator';

export class AssignUserDto {
  @IsString()
  @IsNotEmpty({ message: 'El ID del usuario es requerido' })
  userId: string;

  @IsString()
  @IsNotEmpty({ message: 'El rol es requerido' })
  role: string;
}
