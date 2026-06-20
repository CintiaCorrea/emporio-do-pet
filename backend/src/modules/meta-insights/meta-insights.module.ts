import { Module } from '@nestjs/common';
import { MetaInsightsController } from './meta-insights.controller';
import { MetaInsightsService } from './meta-insights.service';
import { MetaCrmService } from './meta-crm.service';

@Module({
  controllers: [MetaInsightsController],
  providers: [MetaInsightsService, MetaCrmService],
})
export class MetaInsightsModule {}
