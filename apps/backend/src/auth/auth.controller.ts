import {
  Body,
  Controller,
  Post,
  HttpCode,
  HttpStatus,
  Headers,
  BadRequestException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { Public } from './decorators/public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('login')
  signIn(@Body() signInDto: Record<string, any>) {
    return this.authService.signIn(signInDto.email, signInDto.password);
  }

  @Public()
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
  @Post('register')
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }
}