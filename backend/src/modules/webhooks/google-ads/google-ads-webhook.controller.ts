import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { GoogleLeadFormPayload } from './dto/google-lead-form-payload.dto';
import { GoogleAdsWebhookService } from './google-ads-webhook.service';

@ApiTags('webhooks')
@Controller('webhooks/google-ads')
export class GoogleAdsWebhookController {
  constructor(private readonly service: GoogleAdsWebhookService) {}

  /**
   * Recebe os leads do formulário de anúncio do Google Ads (Lead Form).
   * O Google envia a chave secreta no campo `google_key` do corpo — ela
   * deve bater com GOOGLE_LEAD_FORM_KEY (Fly secret).
   */
  @Post('lead-form')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Recebe leads do Google Ads Lead Form e cria Lead na pipeline Comercial',
  })
  async leadForm(@Body() payload: GoogleLeadFormPayload) {
    const expected = process.env.GOOGLE_LEAD_FORM_KEY;
    if (!expected) {
      throw new BadRequestException(
        'GOOGLE_LEAD_FORM_KEY não configurado no Fly secrets',
      );
    }
    if (!payload || payload.google_key !== expected) {
      throw new UnauthorizedException('Invalid google_key');
    }
    return this.service.handle(payload);
  }
}
