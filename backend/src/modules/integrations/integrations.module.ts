import { Module } from '@nestjs/common';
import { BotConversaController } from './botconversa.controller';
import { BcPollCronService } from './bc-poll-cron.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [BotConversaController],
  providers: [BcPollCronService],
})
export class IntegrationsModule {}
