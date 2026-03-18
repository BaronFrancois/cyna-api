import { IsString } from 'class-validator';

export class UpsertHomeTextBlockDto {
  @IsString()
  content: string;
}
