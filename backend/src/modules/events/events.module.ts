import { Module, Global } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { BullModule } from '@nestjs/bullmq';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Global()
@Module({
  imports: [
    EventEmitterModule.forRoot({
      // Use wildcards for event names
      wildcard: true,
      // Use delimiter for namespaced events
      delimiter: '.',
      // Allow new listeners
      newListener: false,
      // Remove listeners on shutdown
      removeListener: false,
      // Max listeners per event
      maxListeners: 10,
      // Emit errors for uncaught events
      verboseMemoryLeak: true,
      // Ignore errors
      ignoreErrors: false,
    }),
    BullModule.registerQueue({
      name: 'automations',
    }),
    PrismaModule,
  ],
  controllers: [EventsController],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}
