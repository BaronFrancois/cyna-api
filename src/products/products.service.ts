import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { CreateProductImageDto } from './dto/create-product-image.dto';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  findAll(onlyAvailable = false) {
    return this.prisma.product.findMany({
      where: onlyAvailable ? { isAvailable: true } : undefined,
      include: { images: true, category: true, subscriptionPlans: true },
      orderBy: { priorityOrder: 'asc' },
    });
  }

  findFeatured() {
    return this.prisma.product.findMany({
      where: { isFeatured: true, isAvailable: true },
      include: { images: true, subscriptionPlans: true },
      orderBy: { priorityOrder: 'asc' },
    });
  }

  async findBySlug(slug: string) {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: { images: true, category: true, subscriptionPlans: true },
    });
    if (!product) throw new NotFoundException('Produit introuvable');
    return product;
  }

  async findOne(id: number) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { images: true, category: true, subscriptionPlans: true },
    });
    if (!product) throw new NotFoundException('Produit introuvable');
    return product;
  }

  create(dto: CreateProductDto) {
    return this.prisma.product.create({
      data: dto,
      include: { images: true, subscriptionPlans: true },
    });
  }

  async update(id: number, dto: Partial<CreateProductDto>) {
    await this.findOne(id);
    return this.prisma.product.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prisma.product.delete({ where: { id } });
    return { message: 'Produit supprimé' };
  }

  addImage(productId: number, dto: CreateProductImageDto) {
    return this.prisma.productImage.create({ data: { ...dto, productId } });
  }

  async removeImage(productId: number, imageId: number) {
    const image = await this.prisma.productImage.findUnique({ where: { id: imageId } });
    if (!image || image.productId !== productId) throw new NotFoundException('Image introuvable');
    await this.prisma.productImage.delete({ where: { id: imageId } });
    return { message: 'Image supprimée' };
  }
}
