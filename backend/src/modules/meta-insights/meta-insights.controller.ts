import { Controller, Get, Query } from '@nestjs/common';
import { MetaInsightsService } from './meta-insights.service';

const PERIODS = ['last_7', 'last_30', 'this_month', 'last_month'];

@Controller('meta-insights')
export class MetaInsightsController {
  constructor(private readonly service: MetaInsightsService) {}

  @Get('metrics')
  metrics(@Query('period') period?: string) {
    const per = PERIODS.includes(period || '') ? (period as string) : 'last_30';
    return this.service.getMetrics(per);
  }
}
