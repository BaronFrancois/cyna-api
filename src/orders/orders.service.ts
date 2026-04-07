import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderStatus } from '@prisma/client';
import { randomBytes } from 'crypto';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  findAllForUser(userId: number) {
    return this.prisma.order.findMany({
      where: { userId },
      include: {
        items: {
          include: {
            product: { include: { category: true } },
            subscriptionPlan: true,
          },
        },
        billingAddress: true,
        paymentMethod: true,
        invoice: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  findAll() {
    return this.prisma.order.findMany({
      include: { items: true, user: { select: { id: true, email: true, firstName: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number, userId?: number) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { items: true, billingAddress: true, invoice: true },
    });
    if (!order) throw new NotFoundException('Commande introuvable');
    if (userId && order.userId !== userId) throw new ForbiddenException();
    return order;
  }

  async create(userId: number, dto: CreateOrderDto) {
    const cart = await this.prisma.cart.findFirst({
      where: { userId },
      include: { items: { include: { product: true, subscriptionPlan: true } } },
    });

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Le panier est vide');
    }

    const subtotal = cart.items.reduce(
      (sum, item) => sum + Number(item.unitPrice) * item.quantity,
      0,
    );
    const taxAmount = subtotal * 0.2; // TVA 20%
    const totalAmount = subtotal + taxAmount;

    const orderNumber = `ORD-${Date.now()}-${randomBytes(3).toString('hex').toUpperCase()}`;

    const order = await this.prisma.order.create({
      data: {
        userId,
        billingAddressId: dto.billingAddressId,
        paymentMethodId: dto.paymentMethodId,
        orderNumber,
        subtotal,
        taxAmount,
        totalAmount,
        items: {
          create: cart.items.map((item) => ({
            productId: item.productId,
            subscriptionPlanId: item.subscriptionPlanId,
            productName: item.product.name,
            planLabel: item.subscriptionPlan.label,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: Number(item.unitPrice) * item.quantity,
          })),
        },
      },
      include: { items: true },
    });

    await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });

    return order;
  }

  async updateStatus(id: number, status: OrderStatus) {
    await this.findOne(id);
    return this.prisma.order.update({ where: { id }, data: { status } });
  }

  async cancel(id: number, userId: number) {
    const order = await this.findOne(id, userId);
    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException('Seules les commandes en attente peuvent être annulées');
    }
    return this.prisma.order.update({
      where: { id },
      data: { status: OrderStatus.CANCELLED },
    });
  }
}
