import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContactMessageDto } from './dto/create-contact-message.dto';
import { ContactStatus } from '@prisma/client';

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);

  constructor(private prisma: PrismaService) {}

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

  async create(dto: CreateContactMessageDto, userId?: number) {
    const row = await this.prisma.contactMessage.create({
      data: { ...dto, userId },
    });
    void this.notifySupport(row).catch((e) =>
      this.logger.warn(`Contact e-mail notification failed: ${e}`),
    );
    return row;
  }

  /** Transfert provisoire vers l’équipe support (même variables SMTP que l’auth). */
  private async notifySupport(row: {
    id: number;
    email: string;
    subject: string;
    message: string;
  }) {
    const to =
      process.env.CONTACT_SUPPORT_EMAIL ?? 'francois.baron@mewo-campus.fr';

    if (!process.env.MAIL_HOST) {
      this.logger.log(
        `[contact #${row.id}] from=${row.email} subject="${row.subject}" — stored in DB (MAIL_HOST unset, no e-mail sent)`,
      );
      return;
    }

    const transporter = this.mailer();
    await transporter.sendMail({
      from: `"Cyna vitrine" <${process.env.MAIL_FROM || process.env.MAIL_USER}>`,
      to,
      replyTo: row.email,
      subject: `[Contact vitrine] ${row.subject} (#${row.id})`,
      text: `From: ${row.email}\nSubject: ${row.subject}\n\n${row.message}`,
    });
  }

  findAll() {
    return this.prisma.contactMessage.findMany({
      include: { user: { select: { id: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const msg = await this.prisma.contactMessage.findUnique({ where: { id } });
    if (!msg) throw new NotFoundException('Message introuvable');
    return msg;
  }

  async updateStatus(id: number, status: ContactStatus) {
    await this.findOne(id);
    return this.prisma.contactMessage.update({ where: { id }, data: { status } });
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prisma.contactMessage.delete({ where: { id } });
    return { message: 'Message supprimé' };
  }
}
