import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { ForgotPasswordCodeDto } from './dto/forgot-password-code.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('Un compte avec cet email existe déjà.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        passwordHash,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    return user;
  }

  async forgotPasswordCode(dto: ForgotPasswordCodeDto) {
    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: { token: dto.code },
      include: { user: true },
    });

    if (!resetToken) {
      throw new NotFoundException('Code de réinitialisation invalide.');
    }

    if (resetToken.used) {
      throw new BadRequestException('Ce code a déjà été utilisé.');
    }

    if (resetToken.expiresAt < new Date()) {
      throw new BadRequestException('Ce code a expiré.');
    }

    if (resetToken.user.email !== dto.email) {
      throw new BadRequestException('Email ou code incorrect.');
    }

    const newPasswordHash = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash: newPasswordHash },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { used: true },
      }),
    ]);

    return { message: 'Mot de passe réinitialisé avec succès.' };
  }
}
