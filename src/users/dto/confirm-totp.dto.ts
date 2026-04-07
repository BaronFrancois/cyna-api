import { IsString, Length } from 'class-validator';

export class ConfirmTotpDto {
  @IsString()
  @Length(6, 8)
  token: string;
}
