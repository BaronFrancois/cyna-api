import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertHomeTextBlockDto } from './dto/upsert-home-text-block.dto';

@Injectable()
export class HomeTextBlocksService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.homeTextBlock.findMany();
  }

  async findOne(identifier: string) {
    const block = await this.prisma.homeTextBlock.findUnique({ where: { identifier } });
    if (!block) throw new NotFoundException('Bloc introuvable');
    return block;
  }

  upsert(identifier: string, dto: UpsertHomeTextBlockDto) {
    return this.prisma.homeTextBlock.upsert({
      where: { identifier },
      update: { content: dto.content },
      create: { identifier, content: dto.content },
    });
  }

  async remove(identifier: string) {
    await this.findOne(identifier);
    await this.prisma.homeTextBlock.delete({ where: { identifier } });
    return { message: 'Bloc supprimé' };
  }
}
