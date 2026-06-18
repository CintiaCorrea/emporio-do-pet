import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GoogleAdsService } from './google-ads.service';
import { GoogleAdsPeriod, GoogleAdsSegment } from './dto/google-ads.types';

const SEGMENTS: GoogleAdsSegment[] = ['consolidado', 'clinica', 'fisioterapia', 'medicina-integrativa'];
const PERIODS: GoogleAdsPeriod[] = ['last_7', 'last_30', 'this_month'];

@ApiTags('google-ads')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('google-ads')
export class GoogleAdsController {
  constructor(private readonly service: GoogleAdsService) {}

  @Get('metrics')
  @ApiOperation({ summary: 'Métricas do painel de tráfego (Ads + cruzamento CRM)' })
  async metrics(@Query('segment') segment?: string, @Query('period') period?: string) {
    const seg = (SEGMENTS.includes(segment as GoogleAdsSegment) ? segment : 'consolidado') as GoogleAdsSegment;
    const per = (PERIODS.includes(period as GoogleAdsPeriod) ? period : 'last_30') as GoogleAdsPeriod;
    return this.service.getMetrics(seg, per);
  }
}
