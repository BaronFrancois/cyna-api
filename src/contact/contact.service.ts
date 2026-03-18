import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContactMessageDto } from './dto/create-contact-message.dto';
import { ContactStatus } from '../../generated/prisma';

@Injectable()
export class ContactService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreateContactMessageDto, userId?: number) {
    return this.prisma.contactMessage.create({
      data: { ...dto, userId },
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
