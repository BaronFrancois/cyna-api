import { IsString, IsOptional, IsInt } from 'class-validator';

export class CreateProductImageDto {
  @IsString()
  imageUrl: string;

  @IsInt()
  @IsOptional()
  displayOrder?: number;

  @IsString()
  @IsOptional()
  altText?: string;
}
