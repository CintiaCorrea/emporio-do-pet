import { Module } from '@nestjs/common';
import { GoogleAdsWebhookController } from './google-ads-webhook.controller';
import { GoogleAdsWebhookService } from './google-ads-webhook.service';

@Module({
  controllers: [GoogleAdsWebhookController],
  providers: [GoogleAdsWebhookService],
})
export class GoogleAdsWebhookModule {}
