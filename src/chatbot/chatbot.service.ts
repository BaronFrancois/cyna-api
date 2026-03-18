import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateChatbotMessageDto } from './dto/create-chatbot-message.dto';
import { ChatbotSessionStatus } from '../../generated/prisma';

@Injectable()
export class ChatbotService {
  constructor(private prisma: PrismaService) {}

  createSession(userId?: number, guestToken?: string) {
    return this.prisma.chatbotSession.create({
      data: { userId, guestToken },
    });
  }

  findAll() {
    return this.prisma.chatbotSession.findMany({
      include: { user: { select: { id: true, email: true } }, messages: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findSession(id: number, userId?: number, guestToken?: string) {
    const session = await this.prisma.chatbotSession.findUnique({
      where: { id },
      include: { messages: { orderBy: { sentAt: 'asc' } } },
    });
    if (!session) throw new NotFoundException('Session introuvable');
    if (userId && session.userId && session.userId !== userId) throw new ForbiddenException();
    if (guestToken && session.guestToken && session.guestToken !== guestToken) throw new ForbiddenException();
    return session;
  }

  async addMessage(sessionId: number, dto: CreateChatbotMessageDto) {
    const session = await this.prisma.chatbotSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('Session introuvable');
    return this.prisma.chatbotMessage.create({
      data: { chatbotSessionId: sessionId, ...dto },
    });
  }

  async updateStatus(id: number, status: ChatbotSessionStatus) {
    const session = await this.prisma.chatbotSession.findUnique({ where: { id } });
    if (!session) throw new NotFoundException('Session introuvable');
    return this.prisma.chatbotSession.update({ where: { id }, data: { status } });
  }
}
