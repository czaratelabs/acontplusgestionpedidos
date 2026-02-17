import { Module, Global } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClsService } from './cls-context.service';
import { ClsMiddleware } from './cls.middleware';
import { AuthClsMiddleware } from '../auth-cls.middleware';

@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '24h' },
      }),
    }),
  ],
  providers: [ClsService, ClsMiddleware, AuthClsMiddleware],
  exports: [ClsService, JwtModule, AuthClsMiddleware],
})
export class ClsModule {}