import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ChatbotService } from './chatbot.service';
import { CynaAssistantService } from './cyna-assistant.service';
import { CreateChatbotMessageDto } from './dto/create-chatbot-message.dto';
import { VitrineChatDto } from './dto/vitrine-chat.dto';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Role, ChatbotSessionStatus } from '@prisma/client';

@Controller('chatbot')
export class ChatbotController {
  constructor(
    private chatbotService: ChatbotService,
    private cynaAssistantService: CynaAssistantService,
  ) {}

  /** Chat vitrine (Groq / Gemini) — clés dans .env API uniquement */
  @Public()
  @Post('vitrine')
  vitrineChat(@Body() dto: VitrineChatDto) {
    return this.cynaAssistantService.reply(dto);
  }

  @Public()
  @Post('sessions')
  createSession(@Req() req: any, @Query('guestToken') guestToken?: string) {
    const userId = req.user?.sub;
    return this.chatbotService.createSession(userId, guestToken);
  }

  @Public()
  @Get('sessions/:id')
  findSession(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
    @Query('guestToken') guestToken?: string,
  ) {
    const userId = req.user?.sub;
    return this.chatbotService.findSession(id, userId, guestToken);
  }

  @Public()
  @Post('sessions/:id/messages')
  addMessage(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateChatbotMessageDto) {
    return this.chatbotService.addMessage(id, dto);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Get('admin/sessions')
  findAll() {
    return this.chatbotService.findAll();
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Patch('admin/sessions/:id/status')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: ChatbotSessionStatus,
  ) {
    return this.chatbotService.updateStatus(id, status);
  }
}
