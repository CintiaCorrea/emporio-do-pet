import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CronHealthService } from './cron-health.service';
import { JwtAuthGuard } from '../modules/auth/guards/jwt-auth.guard';

@ApiTags('health')
@Controller('health')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CronHealthController {
  constructor(private readonly service: CronHealthService) {}

  @Get('automations')
  automations() {
    return this.service.status();
  }
}
