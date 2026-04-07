import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { CreateProductImageDto } from './dto/create-product-image.dto';
import type { ProductSearchQueryDto } from './dto/product-search-query.dto';

const productSearchInclude = {
  images: { orderBy: { displayOrder: 'asc' as const } },
  category: true,
  subscriptionPlans: true,
} satisfies Prisma.ProductInclude;

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  findAll(onlyAvailable = false) {
    return this.prisma.product.findMany({
      where: onlyAvailable ? { isAvailable: true } : undefined,
      include: { images: true, category: true, subscriptionPlans: true },
      orderBy: [{ isAvailable: 'desc' }, { priorityOrder: 'asc' }],
    });
  }

  findFeatured() {
    return this.prisma.product.findMany({
      where: { isFeatured: true, isAvailable: true },
      include: {
        images: { orderBy: { displayOrder: 'asc' } },
        subscriptionPlans: true,
        category: true,
      },
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

  private searchOrderBy(dto: ProductSearchQueryDto): Prisma.ProductOrderByWithRelationInput[] {
    const dir = dto.order === 'desc' ? ('desc' as const) : ('asc' as const);
    switch (dto.sort) {
      case 'price':
        return [{ basePrice: dir }, { isAvailable: 'desc' }, { priorityOrder: 'asc' }];
      case 'new':
        return [{ updatedAt: dir }];
      case 'availability':
        return [{ isAvailable: dir === 'desc' ? 'desc' : 'asc' }, { priorityOrder: 'asc' }];
      default:
        return [{ isAvailable: 'desc' }, { priorityOrder: 'asc' }];
    }
  }

  private searchSecondaryOrderSql(dto: ProductSearchQueryDto): Prisma.Sql {
    const desc = dto.order === 'desc';
    if (dto.sort === 'price') return desc ? Prisma.sql`p."basePrice" DESC` : Prisma.sql`p."basePrice" ASC`;
    if (dto.sort === 'new') return desc ? Prisma.sql`p."updatedAt" DESC` : Prisma.sql`p."updatedAt" ASC`;
    if (dto.sort === 'availability')
      return desc ? Prisma.sql`p."isAvailable" DESC` : Prisma.sql`p."isAvailable" ASC`;
    return Prisma.sql`p."priorityOrder" ASC`;
  }

  private parseCategorySlugs(raw?: string): string[] {
    if (!raw?.trim()) return [];
    return raw
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
  }

  /**
   * Recherche paginée avec facettes. Si `q` est renseigné, classement texte (exact → préfixe → contient).
   */
  async search(dto: ProductSearchQueryDto) {
    const page = dto.page ?? 1;
    const pageSize = dto.pageSize ?? 12;
    const skip = (page - 1) * pageSize;
    const slugList = this.parseCategorySlugs(dto.categorySlugs);
    const qTrim = dto.q?.trim();

    const textAnd: Prisma.ProductWhereInput[] = [];
    if (dto.title?.trim()) {
      textAnd.push({ name: { contains: dto.title.trim(), mode: 'insensitive' } });
    }
    if (dto.description?.trim()) {
      textAnd.push({ description: { contains: dto.description.trim(), mode: 'insensitive' } });
    }
    if (dto.technical?.trim()) {
      textAnd.push({ technicalSpecs: { contains: dto.technical.trim(), mode: 'insensitive' } });
    }

    const facetWhere: Prisma.ProductWhereInput = {};
    if (dto.availableOnly) facetWhere.isAvailable = true;
    if (slugList.length) facetWhere.category = { slug: { in: slugList } };
    if (dto.priceMin != null || dto.priceMax != null) {
      facetWhere.basePrice = {};
      if (dto.priceMin != null) facetWhere.basePrice.gte = dto.priceMin;
      if (dto.priceMax != null) facetWhere.basePrice.lte = dto.priceMax;
    }

    if (!qTrim) {
      const where: Prisma.ProductWhereInput = { ...facetWhere };
      if (textAnd.length) {
        where.AND = Array.isArray(where.AND)
          ? [...where.AND, ...textAnd]
          : [...textAnd];
      }
      const orderBy = this.searchOrderBy(dto);
      const [items, total] = await Promise.all([
        this.prisma.product.findMany({
          where,
          include: productSearchInclude,
          orderBy,
          skip,
          take: pageSize,
        }),
        this.prisma.product.count({ where }),
      ]);
      return {
        items,
        total,
        page,
        pageSize,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      };
    }

    const qLower = qTrim.toLowerCase();
    const likeAny = `%${qLower}%`;
    const prefix = `${qLower}%`;

    const parts: Prisma.Sql[] = [];
    parts.push(
      Prisma.sql`(
        LOWER(p.name) LIKE ${likeAny}
        OR LOWER(COALESCE(p.description, '')) LIKE ${likeAny}
        OR LOWER(COALESCE(p."technicalSpecs", '')) LIKE ${likeAny}
      )`,
    );
    if (dto.availableOnly) parts.push(Prisma.sql`p."isAvailable" = true`);
    if (slugList.length) {
      parts.push(Prisma.sql`c.slug IN (${Prisma.join(slugList.map((s) => Prisma.sql`${s}`))})`);
    }
    if (dto.priceMin != null) parts.push(Prisma.sql`p."basePrice" >= ${dto.priceMin}`);
    if (dto.priceMax != null) parts.push(Prisma.sql`p."basePrice" <= ${dto.priceMax}`);
    if (dto.title?.trim()) {
      parts.push(Prisma.sql`p.name ILIKE ${'%' + dto.title.trim() + '%'}`);
    }
    if (dto.description?.trim()) {
      parts.push(Prisma.sql`COALESCE(p.description, '') ILIKE ${'%' + dto.description.trim() + '%'}`);
    }
    if (dto.technical?.trim()) {
      parts.push(Prisma.sql`COALESCE(p."technicalSpecs", '') ILIKE ${'%' + dto.technical.trim() + '%'}`);
    }

    const whereSql = Prisma.join(parts, ' AND ');
    const secondary = this.searchSecondaryOrderSql(dto);

    const idRows = await this.prisma.$queryRaw<{ id: number }[]>(
      Prisma.sql`
      SELECT p.id FROM products p
      INNER JOIN categories c ON c.id = p."categoryId"
      WHERE ${whereSql}
      ORDER BY
        (CASE
          WHEN LOWER(p.name) = ${qLower} OR LOWER(COALESCE(p.description, '')) = ${qLower} THEN 1
          WHEN LOWER(p.name) LIKE ${prefix} OR LOWER(COALESCE(p.description, '')) LIKE ${prefix} THEN 3
          ELSE 4
        END) ASC,
        p."isAvailable" DESC,
        ${secondary}
      LIMIT ${pageSize} OFFSET ${skip}
    `,
    );

    const countRows = await this.prisma.$queryRaw<{ count: number }[]>(
      Prisma.sql`
      SELECT COUNT(*)::int AS count FROM products p
      INNER JOIN categories c ON c.id = p."categoryId"
      WHERE ${whereSql}
    `,
    );

    const total = countRows[0]?.count ?? 0;
    const ids = idRows.map((r) => r.id);
    if (ids.length === 0) {
      return { items: [], total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
    }

    const found = await this.prisma.product.findMany({
      where: { id: { in: ids } },
      include: productSearchInclude,
    });
    const byId = new Map(found.map((p) => [p.id, p]));
    const items = ids.map((id) => byId.get(id)).filter(Boolean) as Prisma.ProductGetPayload<{
      include: typeof productSearchInclude;
    }>[];

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }
}
