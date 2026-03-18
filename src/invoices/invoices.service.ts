import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InvoicesService {
  constructor(private prisma: PrismaService) {}

  findAllForUser(userId: number) {
    return this.prisma.invoice.findMany({
      where: { userId },
      include: { order: { include: { items: true } } },
      orderBy: { issuedAt: 'desc' },
    });
  }

  findAll() {
    return this.prisma.invoice.findMany({
      include: { user: { select: { id: true, email: true } }, order: true },
      orderBy: { issuedAt: 'desc' },
    });
  }

  async findOne(id: number, userId?: number) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: { order: { include: { items: true } } },
    });
    if (!invoice) throw new NotFoundException('Facture introuvable');
    if (userId && invoice.userId !== userId) throw new ForbiddenException();
    return invoice;
  }
}
