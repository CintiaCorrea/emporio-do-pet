import { Module } from '@nestjs/common';
import { BotconversaWebhookController } from './botconversa-webhook.controller';
import { BotconversaWebhookService } from './botconversa-webhook.service';

@Module({
  controllers: [BotconversaWebhookController],
  providers: [BotconversaWebhookService],
})
export class BotconversaWebhookModule {}
