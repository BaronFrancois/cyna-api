import { IsInt, IsOptional, IsString } from 'class-validator';

export class CreateOrderDto {
  @IsInt()
  billingAddressId: number;

  @IsInt()
  paymentMethodId: number;

  @IsString()
  @IsOptional()
  guestToken?: string;
}
