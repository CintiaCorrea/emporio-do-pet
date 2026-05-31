import { Module } from '@nestjs/common';
import { BotConversaController } from './botconversa.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [BotConversaController],
})
export class IntegrationsModule {}
