import { Controller, Get, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Role } from '@prisma/client';

@UseGuards(RolesGuard)
@Controller('invoices')
export class InvoicesController {
  constructor(private invoicesService: InvoicesService) {}

  @Get()
  findMine(@CurrentUser() user: any) {
    return this.invoicesService.findAllForUser(user.sub);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.invoicesService.findOne(id, user.sub);
  }

  @Roles(Role.ADMIN)
  @Get('admin/all')
  findAll() {
    return this.invoicesService.findAll();
  }
}
