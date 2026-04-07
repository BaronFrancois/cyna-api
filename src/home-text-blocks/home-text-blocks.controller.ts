import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Put,
  UseGuards,
} from '@nestjs/common';
import { HomeTextBlocksService } from './home-text-blocks.service';
import { UpsertHomeTextBlockDto } from './dto/upsert-home-text-block.dto';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Role } from '@prisma/client';

@Controller('home-text-blocks')
export class HomeTextBlocksController {
  constructor(private homeTextBlocksService: HomeTextBlocksService) {}

  @Public()
  @Get()
  findAll() {
    return this.homeTextBlocksService.findAll();
  }

  @Public()
  @Get(':identifier')
  async findOne(@Param('identifier') identifier: string) {
    const block = await this.homeTextBlocksService.findOnePublic(identifier);
    return block ?? { identifier, content: '' };
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Put(':identifier')
  upsert(@Param('identifier') identifier: string, @Body() dto: UpsertHomeTextBlockDto) {
    return this.homeTextBlocksService.upsert(identifier, dto);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Delete(':identifier')
  remove(@Param('identifier') identifier: string) {
    return this.homeTextBlocksService.remove(identifier);
  }
}
