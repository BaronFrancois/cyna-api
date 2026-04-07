import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  findAll(onlyActive = false) {
    return this.prisma.category.findMany({
      where: onlyActive ? { isActive: true } : undefined,
      orderBy: { displayOrder: 'asc' },
    });
  }

  async findBySlug(slug: string) {
    const category = await this.prisma.category.findUnique({
      where: { slug },
      include: {
        products: {
          include: { images: true, subscriptionPlans: true },
          orderBy: [{ isAvailable: 'desc' }, { priorityOrder: 'asc' }],
        },
      },
    });
    if (!category) throw new NotFoundException('Catégorie introuvable');
    return category;
  }

  async findOne(id: number) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) throw new NotFoundException('Catégorie introuvable');
    return category;
  }

  create(dto: CreateCategoryDto) {
    return this.prisma.category.create({ data: dto });
  }

  async update(id: number, dto: Partial<CreateCategoryDto>) {
    await this.findOne(id);
    return this.prisma.category.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prisma.category.delete({ where: { id } });
    return { message: 'Catégorie supprimée' };
  }
}
