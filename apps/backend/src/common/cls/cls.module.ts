import { Module, Global } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClsService } from './cls-context.service';
import { ClsMiddleware } from './cls.middleware';

@Global() // 👈 Importante: Hace que el servicio sea visible en AuthModule, RolesModule, etc.
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
  providers: [ClsService, ClsMiddleware],
  exports: [ClsService, JwtModule], // 👈 JwtModule para que ClsMiddleware resuelva JwtService en AppModule
})
export class ClsModule {}