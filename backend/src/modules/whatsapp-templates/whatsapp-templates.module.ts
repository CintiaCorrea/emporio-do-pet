import { Module } from '@nestjs/common';
import { WhatsAppTemplatesController } from './whatsapp-templates.controller';
import { WhatsAppTemplatesService } from './whatsapp-templates.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [WhatsAppTemplatesController],
  providers: [WhatsAppTemplatesService],
  exports: [WhatsAppTemplatesService],
})
export class WhatsAppTemplatesModule {}
