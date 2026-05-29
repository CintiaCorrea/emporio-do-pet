import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HojeService {
  constructor(private prisma: PrismaService) {}

  async getHoje() {
    const agora = new Date();
    const ontem = new Date();
    ontem.setDate(ontem.getDate() - 1);

    const retornosVencidos = await this.prisma.lead.findMany({
      where: { status: 'CONTACTED' as any, lastActivityAt: { lt: ontem } },
      orderBy: { lastActivityAt: 'asc' },
      take: 50,
    });

    const cutoff2d = new Date();
    cutoff2d.setDate(cutoff2d.getDate() - 2);
    const toques = await this.prisma.lead.findMany({
      where: {
        status: { in: ['ENRICHING', 'ENRICHED', 'QUALIFIED', 'NEW', 'AGUARDANDO_TRIAGEM'] as any },
        lastActivityAt: { lt: cutoff2d, gte: new Date(agora.getTime() - 30 * 86400 * 1000) },
      },
      orderBy: { lastActivityAt: 'asc' },
      take: 50,
    });

    return {
      retornosVencidos: retornosVencidos.map((l: any) => ({
        id: l.id,
        nome: l.name,
        petNome: l.customFields?.petName || null,
        telefone: l.phone,
        diagnostico: l.customFields?.servicoInteresse || l.notes,
        diasAtraso: Math.floor((agora.getTime() - new Date(l.lastActivityAt || l.createdAt).getTime()) / 86400000),
        tags: l.tags,
      })),
      toques: toques.map((l: any) => ({
        id: l.id,
        nome: l.name,
        petNome: l.customFields?.petName || null,
        telefone: l.phone,
        canal: 'WhatsApp',
        ultimaInteracao: l.lastActivityAt,
      })),
      tutoresAcompanhar: 0,
      examesAEntregar: 0,
      pacotesEmRisco: 0,
    };
  }
}
