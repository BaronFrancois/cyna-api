import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus } from '@prisma/client';

@Injectable()
export class AdminAnalyticsService {
  constructor(private prisma: PrismaService) {}

  /** Ventes agrégées sur les N derniers jours + répartition par catégorie (montants TTC). */
  async overview(days = 7) {
    const from = new Date();
    from.setDate(from.getDate() - days);
    from.setHours(0, 0, 0, 0);

    const orders = await this.prisma.order.findMany({
      where: {
        createdAt: { gte: from },
        status: { in: [OrderStatus.PAID, OrderStatus.ACTIVE] },
      },
      include: {
        items: { include: { product: { include: { category: true } } } },
      },
      orderBy: { createdAt: 'asc' },
    });

    const salesByDay: Record<string, number> = {};
    const avgBasketByCategory: Record<string, { sum: number; count: number }> = {};
    const volumeByCategory: Record<string, number> = {};

    for (const o of orders) {
      const day = o.createdAt.toISOString().slice(0, 10);
      const amt = Number(o.totalAmount);
      salesByDay[day] = (salesByDay[day] ?? 0) + amt;

      for (const it of o.items) {
        const cat = it.product?.category?.name ?? 'Autre';
        const line = Number(it.totalPrice);
        volumeByCategory[cat] = (volumeByCategory[cat] ?? 0) + line;
        if (!avgBasketByCategory[cat]) avgBasketByCategory[cat] = { sum: 0, count: 0 };
        avgBasketByCategory[cat].sum += line;
        avgBasketByCategory[cat].count += 1;
      }
    }

    const salesByDayArr = Object.entries(salesByDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, total]) => ({ date, total }));

    const pieByCategory = Object.entries(volumeByCategory).map(([name, value]) => ({ name, value }));

    const stackedBars = Object.entries(avgBasketByCategory).map(([category, { sum, count }]) => ({
      category,
      avgBasket: count ? sum / count : 0,
      lines: count,
    }));

    return {
      days,
      orderCount: orders.length,
      revenueTotal: orders.reduce((s, o) => s + Number(o.totalAmount), 0),
      salesByDay: salesByDayArr,
      pieByCategory,
      avgBasketByCategory: stackedBars,
    };
  }
}
