import { IsString, IsEnum, IsOptional } from 'class-validator';
import { ChatbotSender } from '../../../generated/prisma';

export class CreateChatbotMessageDto {
  @IsEnum(ChatbotSender)
  sender: ChatbotSender;

  @IsString()
  content: string;
}
