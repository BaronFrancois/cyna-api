import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { PaymentMethodsService } from './payment-methods.service';
import { CreatePaymentMethodDto } from './dto/create-payment-method.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('payment-methods')
export class PaymentMethodsController {
  constructor(private paymentMethodsService: PaymentMethodsService) {}

  @Get()
  findAll(@CurrentUser() user: any) {
    return this.paymentMethodsService.findAll(user.sub);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.paymentMethodsService.findOne(id, user.sub);
  }

  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreatePaymentMethodDto) {
    return this.paymentMethodsService.create(user.sub, dto);
  }

  @Patch(':id/default')
  setDefault(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.paymentMethodsService.setDefault(id, user.sub);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.paymentMethodsService.remove(id, user.sub);
  }
}
