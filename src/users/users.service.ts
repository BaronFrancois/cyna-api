import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { generateSecret, generateURI, verifySync } from 'otplib';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

const SELECT_SAFE = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  role: true,
  emailVerified: true,
  twoFactorEnabled: true,
  lastLoginAt: true,
  createdAt: true,
};

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.user.findMany({ select: SELECT_SAFE });
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: SELECT_SAFE });
    if (!user) throw new NotFoundException('Utilisateur introuvable');
    return user;
  }

  async updateProfile(id: number, dto: UpdateUserDto) {
    return this.prisma.user.update({
      where: { id },
      data: dto,
      select: SELECT_SAFE,
    });
  }

  async changePassword(id: number, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException();

    const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Mot de passe actuel incorrect');

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.user.update({ where: { id }, data: { passwordHash } });

    return { message: 'Mot de passe modifié avec succès' };
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prisma.user.delete({ where: { id } });
    return { message: 'Compte supprimé' };
  }

  /** Génère un secret TOTP (à scanner dans une appli d’authentification). Réservé au rôle ADMIN. */
  async setupAdminTwoFactor(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException();
    if (user.role !== Role.ADMIN) throw new ForbiddenException('Réservé aux administrateurs');
    const secret = generateSecret();
    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: secret, twoFactorEnabled: false },
    });
    const otpauthUri = generateURI({
      issuer: 'Cyna Admin',
      label: user.email,
      secret,
    });
    return { secret, otpauthUri };
  }

  /** Active le 2FA après vérification d’un code TOTP valide. */
  async confirmAdminTwoFactor(userId: number, token: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.twoFactorSecret) throw new BadRequestException('2FA non initialisé — appelez setup d’abord');
    const result = verifySync({ secret: user.twoFactorSecret, token });
    if (!result.valid) throw new UnauthorizedException('Code TOTP invalide');
    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: true },
    });
    return { twoFactorEnabled: true };
  }
}
