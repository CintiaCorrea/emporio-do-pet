import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const QUALIFIED_PLUS = ['QUALIFIED', 'CONTACTED', 'CONVERTED'];

export interface CrmCampaignMetrics {
  leads: number;
  qualificados: number;
  convertidos: number;
  vendas: number;
  receita: number;
}

@Injectable()
export class MetaCrmService {
  constructor(private readonly prisma: PrismaService) {}

  // Retorna metricas do CRM por metaCampaignId (cruza leads -> cliente -> atendimentos)
  async byCampaign(): Promise<Record<string, CrmCampaignMetrics>> {
    const leads = await this.prisma.lead.findMany({
      where: { metaCampaignId: { not: null } },
      select: { metaCampaignId: true, status: true, convertedToTutorId: true },
    });

    const agg: Record<string, { leads: number; qualificados: number; convertidos: number; tutors: Set<string> }> = {};
    for (const l of leads) {
      const k = l.metaCampaignId as string;
      if (!agg[k]) agg[k] = { leads: 0, qualificados: 0, convertidos: 0, tutors: new Set() };
      agg[k].leads++;
      if (QUALIFIED_PLUS.indexOf(l.status as any) >= 0) agg[k].qualificados++;
      if (l.status === 'CONVERTED' && l.convertedToTutorId) {
        agg[k].convertidos++;
        agg[k].tutors.add(l.convertedToTutorId);
      }
    }

    const out: Record<string, CrmCampaignMetrics> = {};
    for (const k of Object.keys(agg)) {
      const a = agg[k];
      let receita = 0;
      let vendas = 0;
      const tutorIds = Array.from(a.tutors);
      if (tutorIds.length) {
        const appts = await this.prisma.appointment.findMany({
          where: { tutorId: { in: tutorIds } },
          select: { id: true, tutorId: true },
        });
        if (appts.length) {
          const apptToTutor: Record<string, string> = {};
          for (const ap of appts) apptToTutor[ap.id] = ap.tutorId;
          const items = await this.prisma.appointmentItem.findMany({
            where: { appointmentId: { in: appts.map((ap) => ap.id) } },
            select: { appointmentId: true, valorTotal: true },
          });
          const paidTutors = new Set<string>();
          for (const it of items) {
            const v = it.valorTotal || 0;
            receita += v;
            const t = apptToTutor[it.appointmentId];
            if (v > 0 && t) paidTutors.add(t);
          }
          vendas = paidTutors.size;
        }
      }
      out[k] = { leads: a.leads, qualificados: a.qualificados, convertidos: a.convertidos, vendas, receita };
    }
    return out;
  }
}
