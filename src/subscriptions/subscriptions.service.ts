import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CancelSubscriptionDto } from './dto/cancel-subscription.dto';
import { SubscriptionStatus } from '@prisma/client';

@Injectable()
export class SubscriptionsService {
  constructor(private prisma: PrismaService) {}

  findAllForUser(userId: number) {
    return this.prisma.subscription.findMany({
      where: { userId },
      include: { product: { include: { category: true } }, subscriptionPlan: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  findAll() {
    return this.prisma.subscription.findMany({
      include: {
        user: { select: { id: true, email: true } },
        product: true,
        subscriptionPlan: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number, userId?: number) {
    const sub = await this.prisma.subscription.findUnique({
      where: { id },
      include: { product: true, subscriptionPlan: true },
    });
    if (!sub) throw new NotFoundException('Abonnement introuvable');
    if (userId && sub.userId !== userId) throw new ForbiddenException();
    return sub;
  }

  async cancel(id: number, userId: number, dto: CancelSubscriptionDto) {
    await this.findOne(id, userId);
    return this.prisma.subscription.update({
      where: { id },
      data: {
        status: SubscriptionStatus.CANCELLED,
        cancelledAt: new Date(),
        cancellationReason: dto.reason,
        autoRenew: false,
      },
    });
  }
}
