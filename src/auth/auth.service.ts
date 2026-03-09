import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import * as nodemailer from 'nodemailer';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  // ─── POST /auth/register ──────────────────────────────────────────────────
  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new BadRequestException('Un compte avec cet email existe déjà.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        passwordHash,
      },
      select: { id: true, firstName: true, lastName: true, email: true, role: true, createdAt: true },
    });

    return { message: 'Compte créé avec succès.', user };
  }

  // ─── POST /auth/login ─────────────────────────────────────────────────────
  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) {
      throw new UnauthorizedException('Email ou mot de passe incorrect.');
    }

    const passwordMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatch) {
      throw new UnauthorizedException('Email ou mot de passe incorrect.');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
      },
    };
  }

  // ─── POST /auth/forgot-password ───────────────────────────────────────────
  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });

    // On répond toujours avec succès pour ne pas révéler si l'email existe
    if (!user) {
      return { message: 'Si cet email existe, un code de réinitialisation a été envoyé.' };
    }

    // Génération d'un code à 6 chiffres
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await this.prisma.user.update({
      where: { id: user.id },
      data: { resetPasswordCode: code, resetPasswordExpires: expires },
    });

    await this.sendResetCodeEmail(user.email, user.firstName, code);

    return { message: 'Si cet email existe, un code de réinitialisation a été envoyé.' };
  }

  // ─── POST /auth/forgot-password/code ─────────────────────────────────────
  async resetPasswordWithCode(dto: ResetPasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) {
      throw new BadRequestException('Utilisateur introuvable.');
    }

    if (!user.resetPasswordCode || user.resetPasswordCode !== dto.code) {
      throw new BadRequestException('Code de réinitialisation invalide.');
    }

    if (!user.resetPasswordExpires || user.resetPasswordExpires < new Date()) {
      throw new BadRequestException('Le code de réinitialisation a expiré.');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetPasswordCode: null,
        resetPasswordExpires: null,
      },
    });

    return { message: 'Mot de passe réinitialisé avec succès.' };
  }

  // ─── Envoi d'email ────────────────────────────────────────────────────────
  private async sendResetCodeEmail(email: string, firstName: string, code: string) {
    const transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: Number(process.env.MAIL_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"Cyna" <${process.env.MAIL_FROM || process.env.MAIL_USER}>`,
      to: email,
      subject: 'Réinitialisation de mot de passe',
      html: `
        <p>Bonjour ${firstName},</p>
        <p>Votre code de réinitialisation de mot de passe est :</p>
        <h2 style="letter-spacing: 4px;">${code}</h2>
        <p>Ce code est valable <strong>15 minutes</strong>.</p>
        <p>Si vous n'avez pas fait cette demande, ignorez cet email.</p>
      `,
    });
  }
}
