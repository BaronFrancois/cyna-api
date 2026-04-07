import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResetPasswordTokenDto } from './dto/reset-password-token.dto';
import { Public } from '../common/decorators/public.decorator';

@Public()
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /** POST /auth/register */
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  /** POST /auth/verify-email */
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto);
  }

  /** POST /auth/login */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  /** POST /auth/forgot-password */
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  /** POST /auth/reset-password/token — lien reçu par e-mail (24 h) */
  @Post('reset-password/token')
  @HttpCode(HttpStatus.OK)
  resetPasswordWithToken(@Body() dto: ResetPasswordTokenDto) {
    return this.authService.resetPasswordWithLink(dto);
  }

  /** POST /auth/forgot-password/code — ancien flux code 6 chiffres */
  @Post('forgot-password/code')
  @HttpCode(HttpStatus.OK)
  resetPasswordWithCode(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPasswordWithCode(dto);
  }
}
