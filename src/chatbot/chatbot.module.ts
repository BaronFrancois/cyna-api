import { Module } from '@nestjs/common';
import { ChatbotController } from './chatbot.controller';
import { ChatbotService } from './chatbot.service';
import { CynaAssistantService } from './cyna-assistant.service';

@Module({
  controllers: [ChatbotController],
  providers: [ChatbotService, CynaAssistantService],
})
export class ChatbotModule {}
