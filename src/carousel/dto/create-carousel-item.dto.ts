import { IsString, IsOptional, IsBoolean, IsInt } from 'class-validator';

export class CreateCarouselItemDto {
  @IsString()
  imageUrl: string;

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  subtitle?: string;

  @IsString()
  @IsOptional()
  titleEn?: string;

  @IsString()
  @IsOptional()
  subtitleEn?: string;

  @IsString()
  @IsOptional()
  linkUrl?: string;

  @IsInt()
  @IsOptional()
  displayOrder?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
