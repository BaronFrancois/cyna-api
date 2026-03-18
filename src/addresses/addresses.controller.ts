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
import { AddressesService } from './addresses.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('addresses')
export class AddressesController {
  constructor(private addressesService: AddressesService) {}

  @Get()
  findAll(@CurrentUser() user: any) {
    return this.addressesService.findAll(user.sub);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.addressesService.findOne(id, user.sub);
  }

  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreateAddressDto) {
    return this.addressesService.create(user.sub, dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
    @Body() dto: Partial<CreateAddressDto>,
  ) {
    return this.addressesService.update(id, user.sub, dto);
  }

  @Patch(':id/default')
  setDefault(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.addressesService.setDefault(id, user.sub);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.addressesService.remove(id, user.sub);
  }
}
