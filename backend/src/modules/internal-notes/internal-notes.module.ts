import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { InternalNotesService } from './internal-notes.service';
import { InternalNotesController } from './internal-notes.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [InternalNotesController],
  providers: [InternalNotesService],
})
export class InternalNotesModule {}
