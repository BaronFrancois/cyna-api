import { IsString, IsInt, IsBoolean, IsOptional, Min, Max } from 'class-validator';

export class CreatePaymentMethodDto {
  @IsString()
  providerToken: string;

  @IsString()
  cardHolderName: string;

  @IsString()
  last4Digits: string;

  @IsString()
  cardBrand: string;

  @IsInt()
  @Min(1)
  @Max(12)
  expMonth: number;

  @IsInt()
  expYear: number;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}
