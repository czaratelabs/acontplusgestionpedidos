import {
  Body,
  Controller,
  Post,
  HttpCode,
  HttpStatus,
  Headers,
  BadRequestException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { Public } from './decorators/public.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: 'Iniciar sesión' })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  signIn(@Body() signInDto: Record<string, any>) {
    return this.authService.signIn(signInDto.email, signInDto.password);
  }

  @Public()
  @ApiOperation({ summary: 'Seleccionar empresa activa' })
  @HttpCode(HttpStatus.OK)
  @Post('select-company')
  async selectCompany(
    @Headers('authorization') auth: string,
    @Body() body: { companyId?: string | null },
  ) {
    const token = auth?.startsWith('Bearer ') ? auth.slice(7) : auth;
    if (!token) {
      throw new BadRequestException('Se requiere sessionToken');
    }
    // companyId can be null for SUPER_ADMIN global access
    return this.authService.selectCompany(token, body?.companyId ?? null);
  }

  @Public()
  @ApiOperation({ summary: 'Registrar usuario y empresa' })
  @Post('register')
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Public()
  @Throttle({ default: { ttl: 60000, limit: 20 } })
  @ApiOperation({ summary: 'Renovar JWT' })
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refresh(@Headers('authorization') auth: string, @Body() body: { token?: string }) {
    const fromHeader = auth?.startsWith('Bearer ') ? auth.slice(7) : auth;
    const token = (body?.token ?? fromHeader ?? '').trim();
    if (!token) {
      throw new BadRequestException('Se requiere token actual (Authorization Bearer o body.token)');
    }
    return this.authService.refreshToken(token);
  }
}