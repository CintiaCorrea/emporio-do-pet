import { Module } from '@nestjs/common';
import { GoogleAdsController } from './google-ads.controller';
import { GoogleAdsService } from './google-ads.service';
import { GoogleAdsConversionService } from './google-ads-conversion.service';
import { GoogleAdsConversionListener } from './google-ads-conversion.listener';

@Module({
  controllers: [GoogleAdsController],
  providers: [GoogleAdsService, GoogleAdsConversionService, GoogleAdsConversionListener],
})
export class GoogleAdsModule {}
