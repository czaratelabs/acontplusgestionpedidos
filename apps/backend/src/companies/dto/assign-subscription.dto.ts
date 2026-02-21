import { IsNotEmpty, IsUUID, IsDateString, IsIn } from 'class-validator';

export class AssignSubscriptionDto {
  @IsNotEmpty()
  @IsUUID()
  planId: string;

  @IsNotEmpty()
  @IsDateString()
  startDate: string;

  @IsNotEmpty()
  @IsDateString()
  endDate: string;

  @IsNotEmpty()
  @IsIn(['monthly', 'annual'])
  period: 'monthly' | 'annual';
}
