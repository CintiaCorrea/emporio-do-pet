import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Feed da tela "👻 Agente Sombra": devolve as sugestões geradas pelo GhostSombraListener
 * já enriquecidas com o que a EQUIPE respondeu de fato (primeira mensagem OUTBOUND da
 * conversa depois da sugestão) — pra comparação lado a lado.
 */
@UseGuards(JwtAuthGuard)
@Controller('whatsapp')
export class GhostSombraController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('ghost-sombra')
  async feed() {
    const itens = await this.prisma.listaItem.findMany({
      where: { lista: 'ghost_sombra' },
      orderBy: { createdAt: 'desc' },
      take: 60,
    });
    const out: any[] = [];
    for (const it of itens) {
      let d: any = {};
      try { d = JSON.parse(it.valor); } catch { continue; }
      let equipeRespondeu: string | null = null;
      if (d.conversationId && d.at) {
        const resp = await this.prisma.whatsAppMessage.findFirst({
          where: { conversationId: d.conversationId, direction: 'OUTBOUND', createdAt: { gt: new Date(d.at) } },
          orderBy: { createdAt: 'asc' },
          select: { content: true },
        });
        equipeRespondeu = resp?.content || null;
      }
      out.push({ id: it.id, ...d, equipeRespondeu });
    }
    return out;
  }
}
