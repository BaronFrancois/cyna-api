import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  IsNumber,
  IsDecimal,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProductDto {
  @IsInt()
  categoryId: number;

  @IsString()
  name: string;

  @IsString()
  slug: string;

  @IsString()
  @IsOptional()
  shortDescription?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  technicalSpecs?: string;

  @IsNumber()
  @Type(() => Number)
  basePrice: number;

  @IsBoolean()
  @IsOptional()
  isAvailable?: boolean;

  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean;

  @IsInt()
  @IsOptional()
  priorityOrder?: number;
}
