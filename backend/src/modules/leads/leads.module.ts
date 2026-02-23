import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { LeadsController } from './leads.controller';
import { LeadsService } from './leads.service';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    EventsModule,
    BullModule.registerQueue({
      name: 'lead-enrichment',
    }),
  ],
  controllers: [LeadsController],
  providers: [LeadsService],
  exports: [LeadsService],
})
export class LeadsModule {}
