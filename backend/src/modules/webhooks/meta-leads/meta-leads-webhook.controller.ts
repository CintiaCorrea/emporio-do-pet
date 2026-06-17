import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { MetaLeadgenPayload } from './dto/meta-leadgen-payload.dto';
import { MetaLeadsWebhookService } from './meta-leads-webhook.service';

@ApiTags('webhooks')
@Controller('webhooks/meta')
export class MetaLeadsWebhookController {
  private readonly logger = new Logger(MetaLeadsWebhookController.name);

  constructor(private readonly service: MetaLeadsWebhookService) {}

  /**
   * Verificação do webhook. O Meta chama com GET ao configurar/validar a
   * inscrição, enviando hub.mode=subscribe, hub.verify_token e hub.challenge.
   * Precisamos devolver o challenge se o verify_token bater com META_VERIFY_TOKEN.
   */
  @Get('leads')
  verify(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
  ): string {
    const expected = process.env.META_VERIFY_TOKEN;
    if (mode === 'subscribe' && token && token === expected) {
      this.logger.log('Meta webhook verificado com sucesso');
      return challenge;
    }
    this.logger.warn('Meta webhook: verify_token inválido ou ausente');
    throw new ForbiddenException('Invalid verify token');
  }

  /**
   * Recebe as notificações de leadgen (lead novo num formulário de anúncio).
   * Respondemos 200 rápido; o serviço busca os dados na Graph API e cria o Lead.
   */
  @Post('leads')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Recebe Lead Ads do Meta (Facebook/Instagram) e cria Lead na pipeline Comercial',
  })
  async receive(@Body() payload: MetaLeadgenPayload) {
    return this.service.handlePayload(payload);
  }
}
