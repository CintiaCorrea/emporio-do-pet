import { Body, Controller, ForbiddenException, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { MetaMessagingService } from './meta-messaging.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

/** Webhook do Instagram/Messenger — PÚBLICO (a Meta chama). Igual ao webhook do WhatsApp. */
@ApiTags('meta-messaging')
@Controller('webhook/meta')
export class MetaWebhookController {
  constructor(private readonly svc: MetaMessagingService) {}

  @Get()
  verify(@Query('hub.mode') mode: string, @Query('hub.verify_token') token: string, @Query('hub.challenge') challenge: string) {
    if (mode === 'subscribe' && token && token === this.svc.verifyToken) return challenge;
    throw new ForbiddenException('verify token inválido');
  }

  @Post()
  async receive(@Body() body: any) {
    await this.svc.processarWebhook(body);
    return 'EVENT_RECEIVED';
  }
}

/** Envio + perfis conectados — protegido. Usado pelo inbox (responder) e na hora de conectar os perfis. */
@ApiTags('meta-messaging')
@Controller('meta-messaging')
@UseGuards(JwtAuthGuard)
export class MetaMessagingController {
  constructor(private readonly svc: MetaMessagingService, private readonly prisma: PrismaService) {}

  /** Perfis conectados (SEM o token — dado sensível). */
  @Get('perfis')
  async perfis() {
    return (this.prisma as any).metaCanalPerfil.findMany({ select: { id: true, canal: true, nome: true, pageId: true, igId: true, portfolio: true, ativo: true }, orderBy: { nome: 'asc' } });
  }

  /** Conecta um perfil (Página/IG) — só ADMIN. Guarda o token da Página. */
  @Post('perfis')
  async addPerfil(@CurrentUser() user: any, @Body() b: any) {
    if (user?.role !== 'ADMIN') throw new ForbiddenException('Só a administração conecta perfis.');
    const canal = String(b?.canal || '').toUpperCase();
    if (!['INSTAGRAM', 'MESSENGER'].includes(canal)) throw new ForbiddenException('Canal inválido.');
    if (!b?.nome || !b?.pageId || !b?.accessToken) throw new ForbiddenException('nome, pageId e accessToken são obrigatórios.');
    return (this.prisma as any).metaCanalPerfil.create({ data: { canal, nome: String(b.nome), pageId: String(b.pageId), igId: b.igId ? String(b.igId) : null, accessToken: String(b.accessToken), portfolio: b.portfolio ? String(b.portfolio) : null } });
  }

  /** Responde uma conversa de Instagram/Messenger. */
  @Post('conversas/:id/responder')
  responder(@Param('id') id: string, @Body() b: any) {
    return this.svc.enviarTexto(id, String(b?.texto || ''));
  }
}
