import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppService } from './whatsapp.service';

/**
 * Auto-resposta FORA DO HORÁRIO de atendimento (independente do agente de IA).
 * Config em Listas (item `auto_resposta_config`, JSON): { enabled, mensagem, horarios }.
 * horarios = { "0".."6": { ativo, ini:"08:00", fim:"18:00" } } (0=Dom..6=Sáb, hora de Brasília).
 * Responde no máximo 1x a cada 6h por conversa (evita spam). Best-effort.
 */
@Injectable()
export class WhatsAppOfflineReplyListener {
  private readonly logger = new Logger(WhatsAppOfflineReplyListener.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsapp: WhatsAppService,
  ) {}

  @OnEvent('whatsapp.message.received')
  async handle(payload: any): Promise<void> {
    try {
      const conversationId = payload?.conversationId;
      const userId = payload?.userId;
      if (!conversationId || !userId) return;

      const cfgItem = await (this.prisma as any).listaItem.findFirst({
        where: { lista: 'auto_resposta_config' },
      });
      if (!cfgItem) return;
      let cfg: any = {};
      try { cfg = JSON.parse(cfgItem.valor); } catch { return; }
      if (!cfg.enabled || !cfg.mensagem) return;

      // Dentro do horário → não responde
      if (this.dentroDoHorario(cfg.horarios)) return;

      // Dedupe: já respondeu automaticamente nas últimas 6h nesta conversa?
      const seisHoras = new Date(Date.now() - 6 * 3600 * 1000);
      const recentes = await (this.prisma as any).whatsAppMessage.findMany({
        where: { conversationId, direction: 'OUTBOUND', createdAt: { gte: seisHoras } },
        select: { metadata: true },
      });
      if (recentes.some((m: any) => (m.metadata as Record<string, unknown> | null)?.senderName === 'Auto-resposta')) {
        return;
      }

      await this.whatsapp.sendAndSaveMessage(
        userId,
        conversationId,
        String(cfg.mensagem),
        'TEXT',
        { senderType: 'SYSTEM', senderName: 'Auto-resposta' },
      );
      this.logger.log(`Auto-resposta fora do horário enviada (conversa ${conversationId})`);
    } catch (e: any) {
      this.logger.warn(`Falha na auto-resposta fora do horário: ${e?.message || e}`);
    }
  }

  /** True se AGORA está dentro do horário de atendimento (hora de Brasília). */
  private dentroDoHorario(horarios: any): boolean {
    if (!horarios) return true; // sem horários definidos: considera aberto (não responde)
    const now = new Date();
    const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
    const bt = new Date(utcMs + -3 * 60 * 60000); // Brasília (UTC-3)
    const dia = String(bt.getDay()); // 0=Dom .. 6=Sáb
    const h = horarios[dia];
    if (!h || !h.ativo) return false; // dia fechado -> fora do horário
    const mins = bt.getHours() * 60 + bt.getMinutes();
    const [hi, mi] = String(h.ini || '00:00').split(':').map(Number);
    const [hf, mf] = String(h.fim || '23:59').split(':').map(Number);
    return mins >= hi * 60 + mi && mins < hf * 60 + mf;
  }
}
