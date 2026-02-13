import { PartialType } from '@nestjs/mapped-types';
import { CreateEmissionPointDto } from './create-emission-point.dto';

export class UpdateEmissionPointDto extends PartialType(CreateEmissionPointDto) {}
