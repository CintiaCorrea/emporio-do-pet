import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppService } from './whatsapp.service';

/**
 * PRESENTE de aniversário automático (10% de desconto nos serviços).
 *
 * O lembrete de aniversário (tutor ou pet) deixa uma entrada em `presente_fila`.
 * Quando o tutor RESPONDE pedindo o presente (clique no botão "Receber presente"
 * chega como texto, ou ele escreve "quero"/"presente"/🎁), este listener envia a
 * mensagem do desconto sozinho e tira da fila. Validade: 7 dias após o parabéns.
 */
const VALIDADE_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class PresenteReplyListener {
  private readonly logger = new Logger(PresenteReplyListener.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsapp: WhatsAppService,
  ) {}

  @OnEvent('whatsapp.message.received')
  async handle(payload: any): Promise<void> {
    try {
      const content = (payload?.content || '').toString().toLowerCase();
      const tutorId = payload?.conversation?.tutorId;
      if (!tutorId || !content) return;

      // Só reage se a resposta fala do presente (botão ou texto livre).
      if (!content.includes('presente') && !content.includes('quero') && !content.includes('🎁')) return;

      const item = await this.prisma.listaItem.findFirst({
        where: { lista: 'presente_fila', valor: { contains: `"tutorId":"${tutorId}"` } },
      });
      if (!item) return;

      let dados: any = {};
      try { dados = JSON.parse(item.valor); } catch { return; }

      // Validade: parabéns de mais de 7 dias não gera mais presente automático.
      const idade = Date.now() - new Date(dados.criadoAt || 0).getTime();
      if (idade > VALIDADE_MS) {
        await this.prisma.listaItem.delete({ where: { id: item.id } }).catch(() => undefined);
        return;
      }

      const conv = await this.prisma.whatsAppConversation.findFirst({ where: { tutorId }, orderBy: { lastMessageAt: 'desc' } });
      if (!conv) return;

      // Prazo de 7 dias pra usar o desconto — conta a partir da entrega (agora).
      const venc = new Date(Date.now() + 7 * 24 * 3600 * 1000).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Fortaleza' });

      const texto = dados.pet
        ? [
            `🎁 *Presente de aniversário!*`,
            ``,
            `Que alegria comemorar com vocês! Pelo aniversário do(a) *${dados.pet}*, vocês ganharam *10% de desconto* em nossos serviços. 💛`,
            ``,
            `⏳ Válido por *7 dias* — aproveite até *${venc}*.`,
            ``,
            `É só apresentar esta mensagem aqui no Empório do Pet. Te esperamos! 🐾`,
          ].join('\n')
        : [
            `🎁 *Presente de aniversário!*`,
            ``,
            `Que alegria comemorar com você! Pelo seu aniversário, você ganhou *10% de desconto* em nossos serviços. 💛`,
            ``,
            `⏳ Válido por *7 dias* — aproveite até *${venc}*.`,
            ``,
            `É só apresentar esta mensagem aqui no Empório do Pet. Te esperamos! 🐾`,
          ].join('\n');

      await this.whatsapp.sendAndSaveMessage(conv.userId, conv.id, texto, 'TEXT', { senderType: 'SYSTEM', senderName: 'Presente 🎁' });
      await this.prisma.listaItem.delete({ where: { id: item.id } }).catch(() => undefined);
      this.logger.log(`Presente de aniversário (10% off) entregue ao tutor ${tutorId}${dados.pet ? ` (pet ${dados.pet})` : ''}`);

      // 📴 A conversa promocional se ENCERRA sozinha após entregar o presente (Cintia 31/07):
      // clicar no botão / mandar "quero"/"presente" é ação canned, não conversa de verdade.
      // PROTEÇÃO: se o cliente ESCREVEU algo mais longo (pergunta real), NÃO fecha.
      const textoCliente = String(payload?.content || '').trim();
      if (textoCliente.length <= 30) {
        await this.prisma.whatsAppConversation
          .update({ where: { id: conv.id }, data: { status: 'CLOSED', unreadCount: 0 } })
          .catch(() => undefined);
      }
    } catch (e: any) {
      this.logger.warn(`Falha no PresenteReplyListener: ${e?.message || e}`);
    }
  }
}
