import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BusinessRule } from './entities/business-rule.entity';
import { BusinessRulesService } from './business-rules.service';
import { BusinessRulesController } from './business-rules.controller';

@Module({
  imports: [TypeOrmModule.forFeature([BusinessRule])],
  controllers: [BusinessRulesController],
  providers: [BusinessRulesService],
  exports: [BusinessRulesService],
})
export class BusinessRulesModule {}
