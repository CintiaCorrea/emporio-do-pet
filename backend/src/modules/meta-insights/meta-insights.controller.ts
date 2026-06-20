import { Controller, Get, Query } from '@nestjs/common';
import { MetaInsightsService } from './meta-insights.service';
import { MetaCrmService } from './meta-crm.service';

const PERIODS = ['last_7', 'last_30', 'this_month', 'last_month'];

@Controller('meta-insights')
export class MetaInsightsController {
  constructor(
    private readonly service: MetaInsightsService,
    private readonly crmService: MetaCrmService,
  ) {}

  @Get('metrics')
  metrics(@Query('period') period?: string) {
    const per = PERIODS.includes(period || '') ? (period as string) : 'last_30';
    return this.service.getMetrics(per);
  }

  @Get('crm')
  crm() {
    return this.crmService.byCampaign();
  }
}
