import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AdminAnalyticsService } from './admin-analytics.service';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Role } from '@prisma/client';

@Controller('admin/analytics')
@UseGuards(RolesGuard)
@Roles(Role.ADMIN)
export class AdminAnalyticsController {
  constructor(private readonly adminAnalyticsService: AdminAnalyticsService) {}

  @Get('overview')
  overview(@Query('days') days?: string) {
    const d = Math.min(90, Math.max(1, parseInt(days ?? '7', 10) || 7));
    return this.adminAnalyticsService.overview(d);
  }
}
