import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentMethodDto } from './dto/create-payment-method.dto';

@Injectable()
export class PaymentMethodsService {
  constructor(private prisma: PrismaService) {}

  findAll(userId: number) {
    return this.prisma.paymentMethod.findMany({ where: { userId } });
  }

  async findOne(id: number, userId: number) {
    const pm = await this.prisma.paymentMethod.findUnique({ where: { id } });
    if (!pm) throw new NotFoundException('Méthode de paiement introuvable');
    if (pm.userId !== userId) throw new ForbiddenException();
    return pm;
  }

  async create(userId: number, dto: CreatePaymentMethodDto) {
    if (dto.isDefault) {
      await this.prisma.paymentMethod.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }
    return this.prisma.paymentMethod.create({ data: { ...dto, userId } });
  }

  async setDefault(id: number, userId: number) {
    await this.findOne(id, userId);
    await this.prisma.paymentMethod.updateMany({ where: { userId }, data: { isDefault: false } });
    return this.prisma.paymentMethod.update({ where: { id }, data: { isDefault: true } });
  }

  async remove(id: number, userId: number) {
    await this.findOne(id, userId);
    await this.prisma.paymentMethod.delete({ where: { id } });
    return { message: 'Méthode de paiement supprimée' };
  }
}
