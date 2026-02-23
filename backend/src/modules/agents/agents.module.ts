import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AgentsController } from './agents.controller';
import { AgentTemplatesController } from './agent-templates.controller';
import { AgentsService } from './agents.service';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { AudioModule } from '../audio/audio.module';
import { WhatsAppTemplatesModule } from '../whatsapp-templates/whatsapp-templates.module';
import {
  CostCalculatorService,
  RateLimiterService,
  CircuitBreakerService,
  AgentVersioningService,
  AgentTemplatesService,
} from './services';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    RedisModule,
    AudioModule,
    forwardRef(() => WhatsAppTemplatesModule),
  ],
  controllers: [AgentsController, AgentTemplatesController],
  providers: [
    AgentsService,
    CostCalculatorService,
    RateLimiterService,
    CircuitBreakerService,
    AgentVersioningService,
    AgentTemplatesService,
  ],
  exports: [
    AgentsService,
    CostCalculatorService,
    RateLimiterService,
    CircuitBreakerService,
    AgentVersioningService,
    AgentTemplatesService,
  ],
})
export class AgentsModule {}
