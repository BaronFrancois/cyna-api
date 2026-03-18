import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordCodeDto {
  @ApiProperty({ example: 'jean.dupont@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'abc123xyz', description: 'Token de réinitialisation reçu par email' })
  @IsString()
  code: string;

  @ApiProperty({ example: 'NouveauMotDePasse123!', minLength: 8 })
  @IsString()
  @MinLength(8)
  newPassword: string;
}
