import { Module } from '@nestjs/common';
import { HomeTextBlocksController } from './home-text-blocks.controller';
import { HomeTextBlocksService } from './home-text-blocks.service';

@Module({
  controllers: [HomeTextBlocksController],
  providers: [HomeTextBlocksService],
})
export class HomeTextBlocksModule {}
