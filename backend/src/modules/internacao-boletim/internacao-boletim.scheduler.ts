import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';

/**
 * Boletim de INTERNAÇÃO nos horários programados pelo vet.
 * A cada 10 min: para cada internação ativa, lê os textos programados em
 * `intbolprog_<appointmentId>` (JSON { "07:00": "texto", ... }). Quando o horário
 * chega (janela de até 2h para não mandar boletim velho), envia via WhatsApp e marca
 * em `intbolprog_sent` (chave appointmentId|data|horario) pra não repetir.
 * Horário vazio = não manda nada (o seletor pré-programado é quem manda).
 */
@Injectable()
export class InternacaoBoletimScheduler {
  private readonly logger = new Logger(InternacaoBoletimScheduler.name);
  private readonly JANELA_MIN = 120; // não envia se atrasou mais que 2h

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsapp: WhatsAppService,
  ) {}

  @Cron('*/10 * * * *', { timeZone: 'America/Fortaleza' })
  async rodar(): Promise<void> {
    try {
      const fort = new Date(Date.now() - 3 * 3600 * 1000);
      const nowMin = fort.getUTCHours() * 60 + fort.getUTCMinutes();
      const dateKey = `${fort.getUTCFullYear()}-${String(fort.getUTCMonth() + 1).padStart(2, '0')}-${String(fort.getUTCDate()).padStart(2, '0')}`;

      const appts = await this.prisma.appointment.findMany({
        where: {
          notes: { contains: 'HOSPITALIZATION' },
          status: { notIn: ['DISCHARGED', 'DECEASED', 'CANCELLED'] },
        },
        select: { id: true, notes: true, tutorId: true, pet: { select: { name: true } } },
        take: 500,
      });

      for (const apt of appts) {
        let meta: any = null;
        try { meta = apt.notes ? JSON.parse(apt.notes) : null; } catch { continue; }
        if (meta?.type !== 'HOSPITALIZATION' || !apt.tutorId) continue;

        const prog = await this.prisma.listaItem.findFirst({ where: { lista: `intbolprog_${apt.id}` } });
        if (!prog) continue;
        // Cada horário guarda ou um texto puro (formato antigo) ou { texto, midia }.
        let mapa: Record<string, any> = {};
        try { mapa = JSON.parse(prog.valor); } catch { continue; }

        for (const [horario, bruto] of Object.entries(mapa)) {
          const texto = typeof bruto === 'string' ? bruto : bruto?.texto;
          const midia = typeof bruto === 'string' ? undefined : (bruto?.midia || undefined);
          if (!texto || !String(texto).trim()) continue;
          const [h, m] = String(horario).split(':').map((x) => parseInt(x, 10));
          if (isNaN(h)) continue;
          const alvoMin = h * 60 + (m || 0);
          const atraso = nowMin - alvoMin;
          if (atraso < 0 || atraso > this.JANELA_MIN) continue; // ainda não chegou, ou passou da janela

          const chave = `${apt.id}|${dateKey}|${horario}`;
          const ja = await this.prisma.listaItem.findFirst({ where: { lista: 'intbolprog_sent', valor: chave } });
          if (ja) continue;

          const res = await this.whatsapp.enviarBoletimInternacao(apt.tutorId, String(texto).trim(), apt.pet?.name || 'seu pet', midia);
          if (res.status === 'erro') {
            this.logger.warn(`Boletim internação ${apt.id} ${horario} falhou: ${res.error}`);
            continue; // não marca — tenta na próxima rodada (ainda dentro da janela)
          }
          await this.prisma.listaItem.create({ data: { lista: 'intbolprog_sent', valor: chave } }).catch(() => undefined);
          this.logger.log(`Boletim internação ${apt.id} ${horario} → ${res.status}`);
        }
      }
    } catch (e: any) {
      this.logger.error(`InternacaoBoletimScheduler: ${e?.message || e}`);
    }
  }
}
