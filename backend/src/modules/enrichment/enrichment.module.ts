import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { EnrichmentService } from './enrichment.service';
import { EnrichmentProcessor } from './enrichment.processor';
import { EmailAnalyzer } from './analyzers/email.analyzer';
import { BehaviorAnalyzer } from './analyzers/behavior.analyzer';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { ScoringModule } from '../scoring/scoring.module';
import { InsightsModule } from '../insights/insights.module';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    BullModule.registerQueue({
      name: 'lead-enrichment',
    }),
    forwardRef(() => ScoringModule),
    forwardRef(() => InsightsModule),
  ],
  providers: [EnrichmentService, EnrichmentProcessor, EmailAnalyzer, BehaviorAnalyzer],
  exports: [EnrichmentService, EmailAnalyzer, BehaviorAnalyzer],
})
export class EnrichmentModule {}
