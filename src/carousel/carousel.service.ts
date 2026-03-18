import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCarouselItemDto } from './dto/create-carousel-item.dto';

@Injectable()
export class CarouselService {
  constructor(private prisma: PrismaService) {}

  findAll(onlyActive = false) {
    return this.prisma.carouselItem.findMany({
      where: onlyActive ? { isActive: true } : undefined,
      orderBy: { displayOrder: 'asc' },
    });
  }

  async findOne(id: number) {
    const item = await this.prisma.carouselItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Élément introuvable');
    return item;
  }

  create(dto: CreateCarouselItemDto) {
    return this.prisma.carouselItem.create({ data: dto });
  }

  async update(id: number, dto: Partial<CreateCarouselItemDto>) {
    await this.findOne(id);
    return this.prisma.carouselItem.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prisma.carouselItem.delete({ where: { id } });
    return { message: 'Élément supprimé' };
  }
}
