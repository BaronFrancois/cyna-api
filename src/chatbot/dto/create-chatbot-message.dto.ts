import { IsString, IsEnum, IsOptional } from 'class-validator';
import { ChatbotSender } from '@prisma/client';

export class CreateChatbotMessageDto {
  @IsEnum(ChatbotSender)
  sender: ChatbotSender;

  @IsString()
  content: string;
}
