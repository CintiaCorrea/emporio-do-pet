import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { DashboardService } from './dashboard.service';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Get dashboard summary with all metrics' })
  async getSummary(@CurrentUser() user: { id: string }) {
    return this.dashboardService.getSummary(user.id);
  }

  @Get('recent-activities')
  @ApiOperation({ summary: 'Get recent activities for the dashboard' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getRecentActivities(
    @CurrentUser() user: { id: string },
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.dashboardService.getRecentActivities(user.id, limitNum);
  }

  @Get('upcoming-appointments')
  @ApiOperation({ summary: 'Get upcoming appointments for today' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getUpcomingAppointments(@Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 5;
    return this.dashboardService.getUpcomingAppointments(limitNum);
  }
}

