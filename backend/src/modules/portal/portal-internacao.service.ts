/**
 * Tela Internação do portal (Fatia 4A) — só leitura.
 *
 * O tutor vê exatamente os boletins que a equipe JÁ ENVIOU para ele, e nada
 * mais: nada de anotação interna, conta, prescrição ou evolução clínica.
 *
 * Onde isso mora no CRM (formato legado, conferido em 29/07/2026):
 * · a internação é um `Appointment` com JSON `type: HOSPITALIZATION` em `notes`;
 * · a baia sai de `BoxOcupacao` (ativa) -> `Box`;
 * · os boletins enviados ficam em `lista_itens`, lista `intboletim_hist_<id do
 *   atendimento>`, com o JSON `{ at, horario, texto, por, auto, status }` —
 *   gravado tanto no envio manual quanto pelo agendador automático.
 *
 * A lista `intbol_<id>` (boletins PROGRAMADOS) é de propósito ignorada: é
 * planejamento interno da equipe, não comunicado ao tutor.
 */
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface BoletimDoPortal {
  id: string;
  quando: Date;
  /** manha | tarde | noite, quando a equipe registrou. */
  turno: string | null;
  texto: string;
  porQuem: string | null;
}

export interface InternacaoDoPortal {
  internado: boolean;
  desde: Date | null;
  baia: string | null;
  previsaoAlta: string | null;
  boletins: BoletimDoPortal[];
}

interface Metadados {
  type?: string;
  actualDischargeDate?: string;
  estimatedDischargeDate?: string;
}

@Injectable()
export class PortalInternacaoService {
  private readonly logger = new Logger(PortalInternacaoService.name);

  constructor(private readonly prisma: PrismaService) {}

  private lerMetadados(notes: unknown): Metadados | null {
    if (!notes) return null;
    try {
      const bruto = typeof notes === 'string' ? JSON.parse(notes) : notes;
      if (bruto && typeof bruto === 'object' && bruto.type === 'HOSPITALIZATION') return bruto;
    } catch {
      // `notes` normalmente é texto livre — não é erro, só não é internação.
    }
    return null;
  }

  async doPet(petId: string): Promise<InternacaoDoPortal> {
    const vazio: InternacaoDoPortal = {
      internado: false,
      desde: null,
      baia: null,
      previsaoAlta: null,
      boletins: [],
    };

    // Mesma janela e mesmo critério do alerta da home — se mudar lá, muda aqui.
    const desde = new Date(Date.now() - 120 * 24 * 60 * 60_000);
    const candidatos = await this.prisma.appointment.findMany({
      where: {
        petId,
        date: { gte: desde },
        status: { notIn: ['COMPLETED', 'CANCELED'] },
      },
      select: { id: true, date: true, notes: true },
      orderBy: { date: 'desc' },
      take: 20,
    });

    let internacao: { id: string; date: Date; meta: Metadados } | null = null;
    for (const c of candidatos) {
      const meta = this.lerMetadados(c.notes);
      if (meta && !meta.actualDischargeDate) {
        internacao = { id: c.id, date: c.date, meta };
        break;
      }
    }

    if (!internacao) return vazio;

    const [ocupacao, itens] = await Promise.all([
      this.prisma.boxOcupacao.findFirst({
        where: { appointmentId: internacao.id, ativa: true },
        select: { box: { select: { codigo: true, nome: true } } },
      }),
      this.prisma.listaItem.findMany({
        where: { lista: `intboletim_hist_${internacao.id}` },
        select: { id: true, valor: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
    ]);

    const boletins: BoletimDoPortal[] = [];
    for (const item of itens) {
      try {
        const b = JSON.parse(item.valor);
        const texto = String(b?.texto || '').trim();
        if (!texto) continue;
        boletins.push({
          id: item.id,
          quando: b?.at ? new Date(b.at) : item.createdAt,
          turno: b?.horario ? String(b.horario) : null,
          texto,
          // `auto: true` = enviado pelo agendador; não expomos "robô" pro tutor.
          porQuem: b?.auto ? null : b?.por ? String(b.por) : null,
        });
      } catch {
        this.logger.warn(`Boletim ${item.id} com formato inesperado — ignorado`);
      }
    }

    boletins.sort((a, b) => b.quando.getTime() - a.quando.getTime());

    return {
      internado: true,
      desde: internacao.date,
      baia: ocupacao?.box ? ocupacao.box.nome || ocupacao.box.codigo : null,
      previsaoAlta: internacao.meta.estimatedDischargeDate || null,
      boletins,
    };
  }
}
