import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Feedback do tutor pelo app: AVALIAÇÃO (estrelas → entra no MESMO NPS do sistema,
 * Marketing › NPS, com alerta de detrator) e SUGESTÃO (texto livre → lista lida pela equipe).
 */
@Injectable()
export class PortalFeedbackService {
  constructor(private readonly prisma: PrismaService) {}

  // Estrelas 1-5 viram nota 0-10 do NPS (5★=10, 4=8, 3=6, 2=4, 1=2).
  async avaliar(tutorId: string, dados: { estrelas?: number; comentario?: string }) {
    const estrelas = Math.round(Number(dados.estrelas) || 0);
    if (estrelas < 1 || estrelas > 5) throw new BadRequestException('Escolha de 1 a 5 estrelas.');
    const score = estrelas * 2;
    const classificacao = score >= 9 ? 'PROMOTOR' : score >= 7 ? 'NEUTRO' : 'DETRATOR';
    const tutor = await this.prisma.tutor.findUnique({ where: { id: tutorId }, select: { name: true } });
    await this.prisma.avaliacaoNPS.create({
      data: {
        tutorId,
        score,
        classificacao: classificacao as any,
        categoriaAlvo: 'CLINICA_GERAL' as any,
        canalColeta: 'FORMULARIO' as any,
        comentario: (dados.comentario || '').trim() || null,
        tutorNome: tutor?.name || null,
        observacoes: 'Avaliação pelo app do tutor',
      },
    });
    return { ok: true };
  }

  // Sugestão livre → lista `portal_sugestao` (ListaItem), lida pela tela da equipe.
  async sugerir(tutorId: string, dados: { texto?: string }) {
    const texto = (dados.texto || '').trim();
    if (!texto) throw new BadRequestException('Escreva sua sugestão.');
    if (texto.length > 2000) throw new BadRequestException('Sua sugestão ficou longa demais.');
    const tutor = await this.prisma.tutor.findUnique({ where: { id: tutorId }, select: { name: true } });
    await this.prisma.listaItem.create({
      data: {
        lista: 'portal_sugestao',
        valor: JSON.stringify({ tutorId, tutorNome: tutor?.name || null, texto, at: new Date().toISOString() }),
      },
    });
    return { ok: true };
  }
}
