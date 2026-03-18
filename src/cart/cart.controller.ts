import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { Public } from '../common/decorators/public.decorator';

@Controller('cart')
export class CartController {
  constructor(private cartService: CartService) {}

  @Public()
  @Get()
  getCart(@Req() req: any, @Query('guestToken') guestToken?: string) {
    const userId = req.user?.sub;
    return this.cartService.getCart(userId, guestToken);
  }

  @Public()
  @Post('items')
  addItem(@Body() dto: AddCartItemDto, @Req() req: any) {
    const userId = req.user?.sub;
    return this.cartService.addItem(dto, userId);
  }

  @Public()
  @Patch('items/:id')
  updateItem(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCartItemDto,
    @Req() req: any,
    @Query('guestToken') guestToken?: string,
  ) {
    const userId = req.user?.sub;
    return this.cartService.updateItem(id, dto, userId, guestToken);
  }

  @Public()
  @Delete('items/:id')
  removeItem(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
    @Query('guestToken') guestToken?: string,
  ) {
    const userId = req.user?.sub;
    return this.cartService.removeItem(id, userId, guestToken);
  }

  @Public()
  @Delete()
  clearCart(@Req() req: any, @Query('guestToken') guestToken?: string) {
    const userId = req.user?.sub;
    return this.cartService.clearCart(userId, guestToken);
  }
}
