import { Module } from '@nestjs/common';
import { MetaInsightsController } from './meta-insights.controller';
import { MetaInsightsService } from './meta-insights.service';

@Module({
  controllers: [MetaInsightsController],
  providers: [MetaInsightsService],
})
export class MetaInsightsModule {}
