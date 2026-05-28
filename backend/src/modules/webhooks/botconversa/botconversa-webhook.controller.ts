import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { BotconversaPayload } from './dto/botconversa-payload.dto';
import { BotconversaWebhookService } from './botconversa-webhook.service';

@ApiTags('webhooks')
@Controller('webhooks/botconversa')
export class BotconversaWebhookController {
  constructor(private readonly service: BotconversaWebhookService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Recebe eventos do BotConversa — espelha botconversaLeadCapture do Base44',
  })
  async handle(
    @Headers('x-botconversa-secret') secret: string | undefined,
    @Body() payload: BotconversaPayload,
  ) {
    const expected = process.env.BOTCONVERSA_WEBHOOK_SECRET;
    if (!expected) {
      throw new BadRequestException(
        'BOTCONVERSA_WEBHOOK_SECRET não configurado no Fly secrets',
      );
    }
    if (secret !== expected) {
      throw new UnauthorizedException('Invalid X-Botconversa-Secret');
    }
    return this.service.handle(payload || {});
  }
}
