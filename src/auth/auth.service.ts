import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import * as nodemailer from 'nodemailer';
import { randomBytes } from 'crypto';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResetPasswordTokenDto } from './dto/reset-password-token.dto';

const RESET_LINK_HOURS = 24;
const VERIFY_LINK_HOURS = 24;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  private frontendBase(): string {
    return (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
  }

  // ─── POST /auth/register ──────────────────────────────────────────────────
  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new BadRequestException('Un compte avec cet email existe déjà.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const emailVerificationToken = randomBytes(32).toString('hex');

    const user = await this.prisma.user.create({
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        passwordHash,
        emailVerified: false,
        emailVerificationToken,
      },
      select: { id: true, firstName: true, lastName: true, email: true, role: true, createdAt: true },
    });

    try {
      await this.sendVerificationEmail(user.email, user.firstName, emailVerificationToken);
    } catch {
      // Ne bloque pas l'inscription si l'email est indisponible
    }
    if (!process.env.MAIL_HOST) {
      const u = `${this.frontendBase()}/auth/verify-email?token=${encodeURIComponent(emailVerificationToken)}`;
      console.warn(`[auth] MAIL_HOST non configuré — lien de confirmation (dev) : ${u}`);
    }

    return {
      message: 'Compte créé. Un email de confirmation vous a été envoyé.',
      user,
    };
  }

  // ─── POST /auth/verify-email ──────────────────────────────────────────────
  async verifyEmail(dto: VerifyEmailDto) {
    const user = await this.prisma.user.findFirst({
      where: { emailVerificationToken: dto.token },
    });
    if (!user) {
      throw new BadRequestException('Lien de confirmation invalide ou déjà utilisé.');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerifiedAt: new Date(),
      },
    });

    return { message: 'Adresse e-mail confirmée. Vous pouvez vous connecter.' };
  }

  // ─── POST /auth/login ─────────────────────────────────────────────────────
  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) {
      throw new UnauthorizedException('Email ou mot de passe incorrect.');
    }

    const passwordMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatch) {
      throw new UnauthorizedException('Mot de passe incorrect.');
    }

    if (!user.emailVerified) {
      throw new ForbiddenException(
        'Veuillez confirmer votre adresse e-mail avant de vous connecter. Vérifiez votre boîte de réception.',
      );
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

    if (!user) {
      return { message: 'Si cet email existe, un lien de réinitialisation a été envoyé.' };
    }

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + RESET_LINK_HOURS * 60 * 60 * 1000);

    await this.prisma.passwordResetToken.deleteMany({
      where: { userId: user.id, used: false },
    });

    await this.prisma.passwordResetToken.create({
      data: { userId: user.id, token, expiresAt },
    });

    try {
      await this.sendResetLinkEmail(user.email, user.firstName, token);
    } catch {
      // Ne pas révéler l'échec d'envoi
    }
    if (!process.env.MAIL_HOST) {
      const u = `${this.frontendBase()}/auth/reset-password?token=${encodeURIComponent(token)}`;
      console.warn(`[auth] MAIL_HOST non configuré — lien de réinitialisation (dev) : ${u}`);
    }

    return { message: 'Si cet email existe, un lien de réinitialisation a été envoyé.' };
  }

  // ─── POST /auth/reset-password/token ──────────────────────────────────────
  async resetPasswordWithLink(dto: ResetPasswordTokenDto) {
    const row = await this.prisma.passwordResetToken.findUnique({
      where: { token: dto.token },
      include: { user: true },
    });

    if (!row || row.used) {
      throw new BadRequestException('Lien de réinitialisation invalide ou déjà utilisé.');
    }
    if (row.expiresAt < new Date()) {
      throw new BadRequestException('Ce lien a expiré. Demandez un nouveau lien depuis la page « Mot de passe oublié ».');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: row.userId },
        data: { passwordHash },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: row.id },
        data: { used: true },
      }),
    ]);

    return { message: 'Mot de passe réinitialisé avec succès.' };
  }

  // ─── POST /auth/forgot-password/code (ancien flux à 6 chiffres) ───────────
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

  // ─── Emails ───────────────────────────────────────────────────────────────
  private mailer() {
    return nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: Number(process.env.MAIL_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });
  }

  private async sendVerificationEmail(email: string, firstName: string, token: string) {
    if (!process.env.MAIL_HOST) return;

    const link = `${this.frontendBase()}/auth/verify-email?token=${encodeURIComponent(token)}`;
    const transporter = this.mailer();
    await transporter.sendMail({
      from: `"Cyna" <${process.env.MAIL_FROM || process.env.MAIL_USER}>`,
      to: email,
      subject: 'Confirmez votre compte Cyna',
      html: `
        <p>Bonjour ${firstName},</p>
        <p>Merci de vous être inscrit. Pour activer votre compte, confirmez votre adresse e-mail en cliquant sur le lien ci-dessous :</p>
        <p><a href="${link}">Confirmer mon adresse e-mail</a></p>
        <p>Ce lien est valable <strong>${VERIFY_LINK_HOURS} heures</strong>.</p>
        <p>Si vous n'avez pas créé de compte, ignorez cet e-mail.</p>
      `,
    });
  }

  private async sendResetLinkEmail(email: string, firstName: string, token: string) {
    if (!process.env.MAIL_HOST) return;

    const link = `${this.frontendBase()}/auth/reset-password?token=${encodeURIComponent(token)}`;
    const transporter = this.mailer();
    await transporter.sendMail({
      from: `"Cyna" <${process.env.MAIL_FROM || process.env.MAIL_USER}>`,
      to: email,
      subject: 'Réinitialisation de votre mot de passe Cyna',
      html: `
        <p>Bonjour ${firstName},</p>
        <p>Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le lien ci-dessous :</p>
        <p><a href="${link}">Choisir un nouveau mot de passe</a></p>
        <p>Ce lien est valable <strong>${RESET_LINK_HOURS} heures</strong>.</p>
        <p>Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.</p>
      `,
    });
  }
}
