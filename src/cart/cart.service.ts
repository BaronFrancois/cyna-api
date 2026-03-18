import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@Injectable()
export class CartService {
  constructor(private prisma: PrismaService) {}

  private async getOrCreateCart(userId?: number, guestToken?: string) {
    const where = userId ? { userId } : { guestToken };
    let cart = await this.prisma.cart.findFirst({
      where,
      include: { items: { include: { product: true, subscriptionPlan: true } } },
    });

    if (!cart) {
      cart = await this.prisma.cart.create({
        data: userId ? { userId } : { guestToken },
        include: { items: { include: { product: true, subscriptionPlan: true } } },
      });
    }
    return cart;
  }

  getCart(userId?: number, guestToken?: string) {
    return this.getOrCreateCart(userId, guestToken);
  }

  async addItem(dto: AddCartItemDto, userId?: number) {
    const cart = await this.getOrCreateCart(userId, dto.guestToken);

    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: dto.subscriptionPlanId },
    });
    if (!plan) throw new NotFoundException('Plan introuvable');

    const existing = await this.prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        productId: dto.productId,
        subscriptionPlanId: dto.subscriptionPlanId,
      },
    });

    if (existing) {
      return this.prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + (dto.quantity ?? 1) },
      });
    }

    return this.prisma.cartItem.create({
      data: {
        cartId: cart.id,
        productId: dto.productId,
        subscriptionPlanId: dto.subscriptionPlanId,
        quantity: dto.quantity ?? 1,
        unitPrice: plan.price,
      },
    });
  }

  async updateItem(itemId: number, dto: UpdateCartItemDto, userId?: number, guestToken?: string) {
    const cart = await this.getOrCreateCart(userId, guestToken);
    const item = await this.prisma.cartItem.findFirst({
      where: { id: itemId, cartId: cart.id },
    });
    if (!item) throw new NotFoundException('Article introuvable');

    return this.prisma.cartItem.update({ where: { id: itemId }, data: { quantity: dto.quantity } });
  }

  async removeItem(itemId: number, userId?: number, guestToken?: string) {
    const cart = await this.getOrCreateCart(userId, guestToken);
    const item = await this.prisma.cartItem.findFirst({
      where: { id: itemId, cartId: cart.id },
    });
    if (!item) throw new NotFoundException('Article introuvable');
    await this.prisma.cartItem.delete({ where: { id: itemId } });
    return { message: 'Article retiré' };
  }

  async clearCart(userId?: number, guestToken?: string) {
    const cart = await this.getOrCreateCart(userId, guestToken);
    await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    return { message: 'Panier vidé' };
  }
}
