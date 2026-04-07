import { IsString, MinLength } from 'class-validator';

export class VerifyEmailDto {
  @IsString()
  @MinLength(16, { message: 'Lien de confirmation invalide.' })
  token: string;
}
