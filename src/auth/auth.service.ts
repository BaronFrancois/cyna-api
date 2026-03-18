import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email déjà utilisé');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const emailVerificationToken = randomBytes(32).toString('hex');

    const user = await this.prisma.user.create({
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        passwordHash,
        emailVerificationToken,
      },
    });

    // TODO: envoyer un email de vérification avec emailVerificationToken

    return { message: 'Compte créé. Veuillez vérifier votre email.' };
  }

  async login(dto: LoginDto, ip?: string, userAgent?: string) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('Identifiants invalides');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Identifiants invalides');

    const expiresIn = dto.rememberMe ? '30d' : '1d';
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (dto.rememberMe ? 30 : 1));

    const payload = { sub: user.id, email: user.email, role: user.role };
    const token = await this.jwtService.signAsync(payload, { expiresIn });

    await this.prisma.session.create({
      data: {
        userId: user.id,
        token,
        rememberMe: dto.rememberMe ?? false,
        expiresAt,
        ipAddress: ip,
        userAgent,
      },
    });

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      access_token: token,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
      },
    };
  }

  async logout(token: string) {
    await this.prisma.session.deleteMany({ where: { token } });
    return { message: 'Déconnecté avec succès' };
  }

  async verifyEmail(token: string) {
    const user = await this.prisma.user.findFirst({
      where: { emailVerificationToken: token },
    });
    if (!user) throw new BadRequestException('Token invalide');

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerifiedAt: new Date(),
        emailVerificationToken: null,
      },
    });

    return { message: 'Email vérifié avec succès' };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    // Ne pas révéler si l'email existe
    if (!user) return { message: 'Si ce compte existe, un email a été envoyé.' };

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 heure

    await this.prisma.passwordResetToken.create({
      data: { userId: user.id, token, expiresAt },
    });

    // TODO: envoyer un email avec le token

    return { message: 'Si ce compte existe, un email a été envoyé.' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { token: dto.token },
    });

    if (!record || record.used || record.expiresAt < new Date()) {
      throw new BadRequestException('Token invalide ou expiré');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);

    await this.prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash },
    });

    await this.prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { used: true },
    });

    return { message: 'Mot de passe réinitialisé avec succès' };
  }
}
