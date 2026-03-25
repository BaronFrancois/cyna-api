import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateChatbotMessageDto } from './dto/create-chatbot-message.dto';
import { ChatbotSender, ChatbotSessionStatus } from '@prisma/client';
import { getAutoResponse } from './chatbot-rules';

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
    if (guestToken && session.guestToken && session.guestToken !== guestToken)
      throw new ForbiddenException();
    return session;
  }

  async addMessage(sessionId: number, dto: CreateChatbotMessageDto) {
    const session = await this.prisma.chatbotSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('Session introuvable');

    // Sauvegarder le message de l'utilisateur
    const userMessage = await this.prisma.chatbotMessage.create({
      data: { chatbotSessionId: sessionId, sender: dto.sender, content: dto.content },
    });

    // Générer une réponse automatique seulement si c'est un message utilisateur
    if (dto.sender === ChatbotSender.USER) {
      const { response, escalate } = getAutoResponse(dto.content);

      // Sauvegarder la réponse du bot
      const botMessage = await this.prisma.chatbotMessage.create({
        data: {
          chatbotSessionId: sessionId,
          sender: ChatbotSender.BOT,
          content: response,
        },
      });

      // Escalader la session si nécessaire
      if (escalate && session.status === ChatbotSessionStatus.OPEN) {
        await this.prisma.chatbotSession.update({
          where: { id: sessionId },
          data: { status: ChatbotSessionStatus.ESCALATED },
        });
      }

      return { userMessage, botMessage };
    }

    return { userMessage };
  }

  async updateStatus(id: number, status: ChatbotSessionStatus) {
    const session = await this.prisma.chatbotSession.findUnique({ where: { id } });
    if (!session) throw new NotFoundException('Session introuvable');
    return this.prisma.chatbotSession.update({ where: { id }, data: { status } });
  }
}
