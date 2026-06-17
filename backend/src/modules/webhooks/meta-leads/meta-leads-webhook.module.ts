import { Module } from '@nestjs/common';
import { MetaLeadsWebhookController } from './meta-leads-webhook.controller';
import { MetaLeadsWebhookService } from './meta-leads-webhook.service';

@Module({
  controllers: [MetaLeadsWebhookController],
  providers: [MetaLeadsWebhookService],
})
export class MetaLeadsWebhookModule {}
