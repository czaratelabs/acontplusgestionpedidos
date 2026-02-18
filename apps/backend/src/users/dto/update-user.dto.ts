import { IsOptional, IsString, IsUUID } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  /** Company context: required when updating role so the correct UserCompany is updated. */
  @IsOptional()
  @IsUUID()
  companyId?: string;

  /** New role name for this user in the given company (owner, admin, seller). */
  @IsOptional()
  @IsString()
  role?: string;
}
