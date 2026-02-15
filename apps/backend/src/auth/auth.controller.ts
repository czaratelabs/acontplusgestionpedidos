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
    @Body() body: { companyId: string },
  ) {
    const token = auth?.startsWith('Bearer ') ? auth.slice(7) : auth;
    if (!token || !body?.companyId) {
      throw new BadRequestException('Se requiere sessionToken y companyId');
    }
    return this.authService.selectCompany(token, body.companyId);
  }

  @Public()
  @Post('register')
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }
}