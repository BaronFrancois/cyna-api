import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSubscriptionPlanDto } from './dto/create-subscription-plan.dto';

@Injectable()
export class SubscriptionPlansService {
  constructor(private prisma: PrismaService) {}

  findAll(productId?: number) {
    return this.prisma.subscriptionPlan.findMany({
      where: productId ? { productId, isActive: true } : undefined,
    });
  }

  async findOne(id: number) {
    const plan = await this.prisma.subscriptionPlan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundException('Plan introuvable');
    return plan;
  }

  create(dto: CreateSubscriptionPlanDto) {
    return this.prisma.subscriptionPlan.create({ data: dto });
  }

  async update(id: number, dto: Partial<CreateSubscriptionPlanDto>) {
    await this.findOne(id);
    return this.prisma.subscriptionPlan.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prisma.subscriptionPlan.delete({ where: { id } });
    return { message: 'Plan supprimé' };
  }
}
