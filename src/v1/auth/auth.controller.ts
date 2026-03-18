import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { ForgotPasswordCodeDto } from './dto/forgot-password-code.dto';
import { RegisterDto } from './dto/register.dto';

@ApiTags('Auth')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Créer un nouveau compte utilisateur' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('forgot-password/code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Vérifier le code de réinitialisation et changer le mot de passe' })
  forgotPasswordCode(@Body() dto: ForgotPasswordCodeDto) {
    return this.authService.forgotPasswordCode(dto);
  }
}
