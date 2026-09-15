import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * QUEM ESTÁ USANDO O PORTAL DO TUTOR.
 *
 * Cintia, 15/09/2026: "posso ter uma aba, ou um local onde eu consiga saber quais tutores estão
 * no portal do tutor, para que eu possa fazer o acompanhamento?"
 *
 * O portal não tem cadastro nem senha: o tutor entra com um código enviado no WhatsApp. Então
 * "estar no portal" não é um campo na ficha — é ter entrado pelo menos uma vez. A fonte é o
 * registro de acessos (`ptl_acessos`), que já grava cada evento, inclusive o ENTROU.
 *
 * Isso muda o que a lista pode responder, e para melhor: em vez de "quem tem acesso", ela diz
 * QUEM VOLTOU — e é essa a pergunta de quem quer acompanhar adoção.
 */
@Injectable()
export class PortalUsoService {
  constructor(private readonly prisma: PrismaService) {}

  async listar(): Promise<{
    total: number;
    ativos30d: number;
    tutores: Array<{
      tutorId: string; nome: string; entradas: number;
      primeiraEm: Date; ultimaEm: Date; pets: number;
    }>;
  }> {
    const entradas = await this.prisma.portalAcesso.findMany({
      where: { evento: 'ENTROU', tutorId: { not: null } },
      select: { tutorId: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
      take: 20000,
    }).catch(() => [] as any[]);

    const porTutor = new Map<string, { n: number; primeira: Date; ultima: Date }>();
    for (const e of entradas) {
      const id = String(e.tutorId);
      const atual = porTutor.get(id);
      if (!atual) porTutor.set(id, { n: 1, primeira: e.createdAt, ultima: e.createdAt });
      else { atual.n++; atual.ultima = e.createdAt; }
    }
    if (!porTutor.size) return { total: 0, ativos30d: 0, tutores: [] };

    const ids = [...porTutor.keys()];
    const tutores = await this.prisma.tutor.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, _count: { select: { pets: true } } },
    }).catch(() => [] as any[]);
    const nomePorId = new Map(tutores.map((t: any) => [t.id, t]));

    const trintaDias = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const linhas = ids
      .map((id) => {
        const d = porTutor.get(id)!;
        const t: any = nomePorId.get(id);
        return {
          tutorId: id,
          // Tutor apagado depois de ter entrado: a linha fica, dizendo isso. Some-la esconderia
          // um acesso que existiu.
          nome: t?.name || '(cliente removido)',
          entradas: d.n,
          primeiraEm: d.primeira,
          ultimaEm: d.ultima,
          pets: t?._count?.pets ?? 0,
        };
      })
      // Mais recente primeiro: quem entrou hoje é quem interessa a quem está acompanhando.
      .sort((a, b) => b.ultimaEm.getTime() - a.ultimaEm.getTime());

    return {
      total: linhas.length,
      ativos30d: linhas.filter((l) => l.ultimaEm.getTime() >= trintaDias).length,
      tutores: linhas,
    };
  }
}
