import { Body, Controller, Delete, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PushService } from './push.service';

@ApiTags('push')
@Controller('push')
export class PushController {
  constructor(private readonly push: PushService) {}

  // Pública: o navegador precisa da chave pra se inscrever (sem login).
  @Get('public-key')
  @ApiOperation({ summary: 'Chave pública VAPID (pro navegador se inscrever)' })
  publicKey() {
    return { publicKey: this.push.chavePublica || null, ativo: this.push.ativo };
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('subscribe')
  @ApiOperation({ summary: 'Inscreve o aparelho do usuário pra receber push' })
  subscribe(@CurrentUser() user: { id: string }, @Body() body: { subscription: any; userAgent?: string }) {
    return this.push.inscrever(user.id, body?.subscription || {}, body?.userAgent);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete('subscribe')
  @ApiOperation({ summary: 'Remove a inscrição deste aparelho' })
  unsubscribe(@CurrentUser() user: { id: string }, @Body() body: { endpoint?: string }) {
    return this.push.desinscrever(user.id, body?.endpoint);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('test')
  @ApiOperation({ summary: 'Envia um push de teste pro próprio usuário' })
  test(@CurrentUser() user: { id: string }) {
    return this.push.testar(user.id);
  }
}
