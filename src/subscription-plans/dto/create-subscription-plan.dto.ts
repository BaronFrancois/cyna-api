import { IsString, IsInt, IsBoolean, IsOptional, IsEnum, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { BillingCycle } from '@prisma/client';

export class CreateSubscriptionPlanDto {
  @IsInt()
  productId: number;

  @IsString()
  label: string;

  @IsEnum(BillingCycle)
  billingCycle: BillingCycle;

  @IsNumber()
  @Type(() => Number)
  price: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
