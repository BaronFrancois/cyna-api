import { IsString, Matches, MinLength } from 'class-validator';

export class ResetPasswordTokenDto {
  @IsString()
  @MinLength(16, { message: 'Lien de réinitialisation invalide.' })
  token: string;

  @IsString()
  @MinLength(8, { message: 'Le mot de passe doit contenir au moins 8 caractères.' })
  @Matches(/[A-Z]/, { message: 'Le mot de passe doit contenir au moins une majuscule.' })
  @Matches(/[0-9]/, { message: 'Le mot de passe doit contenir au moins un chiffre.' })
  @Matches(/[!@#$%^&*()\-_=+[\]{};:'",.<>?/\\|`~]/, {
    message: 'Le mot de passe doit contenir au moins un caractère spécial.',
  })
  newPassword: string;
}
