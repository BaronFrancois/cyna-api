import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAddressDto } from './dto/create-address.dto';

@Injectable()
export class AddressesService {
  constructor(private prisma: PrismaService) {}

  findAll(userId: number) {
    return this.prisma.address.findMany({ where: { userId } });
  }

  async findOne(id: number, userId: number) {
    const address = await this.prisma.address.findUnique({ where: { id } });
    if (!address) throw new NotFoundException('Adresse introuvable');
    if (address.userId !== userId) throw new ForbiddenException();
    return address;
  }

  async create(userId: number, dto: CreateAddressDto) {
    if (dto.isDefault) {
      await this.prisma.address.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }
    return this.prisma.address.create({ data: { ...dto, userId } });
  }

  async update(id: number, userId: number, dto: Partial<CreateAddressDto>) {
    await this.findOne(id, userId);
    if (dto.isDefault) {
      await this.prisma.address.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }
    return this.prisma.address.update({ where: { id }, data: dto });
  }

  async setDefault(id: number, userId: number) {
    await this.findOne(id, userId);
    await this.prisma.address.updateMany({ where: { userId }, data: { isDefault: false } });
    return this.prisma.address.update({ where: { id }, data: { isDefault: true } });
  }

  async remove(id: number, userId: number) {
    await this.findOne(id, userId);
    await this.prisma.address.delete({ where: { id } });
    return { message: 'Adresse supprimée' };
  }
}
