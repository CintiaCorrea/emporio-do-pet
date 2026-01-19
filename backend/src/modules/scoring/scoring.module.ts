import { Module } from '@nestjs/common';
import { ScoringService } from './scoring.service';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [PrismaModule, RedisModule],
  providers: [ScoringService],
  exports: [ScoringService],
})
export class ScoringModule {}
