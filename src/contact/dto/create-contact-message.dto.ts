import { IsEmail, IsString, IsEnum, IsOptional } from 'class-validator';
import { ContactSource } from '@prisma/client';

export class CreateContactMessageDto {
  @IsEmail()
  email: string;

  @IsString()
  subject: string;

  @IsString()
  message: string;

  @IsEnum(ContactSource)
  @IsOptional()
  source?: ContactSource;
}
