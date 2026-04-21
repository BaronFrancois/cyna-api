import { Controller, Get, Param, ParseIntPipe, UseGuards, Res } from '@nestjs/common';
import { Response } from 'express';
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

  @Get('admin/all')
  @Roles(Role.ADMIN)
  findAll() {
    return this.invoicesService.findAll();
  }

  @Get(':id/pdf')
  async downloadPdf(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
    @Res() res: Response,
  ) {
    const buffer = await this.invoicesService.generatePdfBuffer(id, user.sub);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="facture-${id}.pdf"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.invoicesService.findOne(id, user.sub);
  }
}
