import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { InternacaoAlertasService } from './internacao-alertas.service';

/**
 * ETAPA 3 — avisa o veterinário DE PLANTÃO no WhatsApp ~15 min antes de uma
 * medicação/aferição vencer, respeitando a escala dele.
 * A cada 5 min: pega os alertas dos próximos 15 min (mesmo cálculo do pop-up),
 * filtra os que têm o toggle `avisos.whatsapp` ligado, e envia o template Meta
 * `lembrete_plantao` para cada vet cujo horário atual está DENTRO da escala.
 * Dedup por dia em `intalerta_wa_sent` (apptId|tipo|horário|telefone).
 * Só funciona de fato quando o template estiver APROVADO na Meta.
 */
@Injectable()
export class InternacaoAlertasScheduler {
  private readonly logger = new Logger(InternacaoAlertasScheduler.name);
  private readonly TEMPLATE = 'alerta_medicacao_internacao';

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsapp: WhatsAppService,
    private readonly alertas: InternacaoAlertasService,
  ) {}

  private hm(v: any): number | null {
    const m = /^(\d{1,2}):(\d{2})$/.exec(String(v || '').trim());
    if (!m) return null;
    const n = parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
    return isNaN(n) ? null : n;
  }
  private dentroDaEscala(escala: any, dow: number, mins: number): boolean {
    let o: any = escala;
    if (typeof escala === 'string') { try { o = JSON.parse(escala); } catch { return false; } }
    const janelas: any[] = o?.semana?.[String(dow)] || [];
    for (const par of janelas) {
      const ini = this.hm(par?.[0]); const fim = this.hm(par?.[1]);
      if (ini == null || fim == null) continue;
      if (mins >= ini && mins <= fim) return true;
    }
    return false;
  }

  private async vetsDePlantao(): Promise<{ nome: string; phone: string }[]> {
    const nowF = new Date(Date.now() - 3 * 3600 * 1000); // Fortaleza (UTC-3)
    const dow = nowF.getUTCDay();
    const mins = nowF.getUTCHours() * 60 + nowF.getUTCMinutes();
    const profs = await this.prisma.profissional.findMany({
      where: { ativo: true, telefone: { not: null }, tipo: 'VETERINARIO' as any }, // só veterinários
      select: { nomeExibicao: true, nomeCompleto: true, telefone: true, escala: true },
    });
    const out: { nome: string; phone: string }[] = [];
    for (const p of profs) {
      if (!p.telefone) continue;
      if (this.dentroDaEscala(p.escala, dow, mins)) {
        out.push({ nome: p.nomeExibicao || p.nomeCompleto || '', phone: p.telefone });
      }
    }
    return out;
  }

  @Cron('*/5 * * * *', { timeZone: 'America/Fortaleza' })
  async rodar(): Promise<void> {
    try {
      const { alertas } = await this.alertas.proximos(15);
      // o template `alerta_medicacao_internacao` é só de MEDICAÇÃO e só do aviso ANTECIPADO
      // (os "atrasados" do repetir-se-atrasar são só pop-up na tela, não geram WhatsApp).
      const paraWhats = alertas.filter((a: any) => a?.avisos?.whatsapp && a?.tipo === 'medicacao' && !a?.atrasado);
      if (!paraWhats.length) return;

      const vets = await this.vetsDePlantao();
      if (!vets.length) return; // ninguém de plantão agora → não avisa

      const fort = new Date(Date.now() - 3 * 3600 * 1000);
      const dateKey = `${fort.getUTCFullYear()}-${String(fort.getUTCMonth() + 1).padStart(2, '0')}-${String(fort.getUTCDate()).padStart(2, '0')}`;

      // dedup do dia (limpa dias anteriores)
      const enviados = await this.prisma.listaItem.findMany({ where: { lista: 'intalerta_wa_sent' }, select: { id: true, valor: true } });
      const doDia = new Set<string>();
      for (const e of enviados) {
        if (String(e.valor).startsWith(dateKey + '|')) doDia.add(e.valor);
        else this.prisma.listaItem.delete({ where: { id: e.id } }).catch(() => {});
      }
      // limpa pendentes de confirmação velhos (já confirmados ou com +3h)
      const pends = await this.prisma.listaItem.findMany({ where: { lista: 'intalerta_wa_pend' }, select: { id: true, valor: true } });
      for (const p of pends) {
        let v: any = null; try { v = JSON.parse(p.valor); } catch { v = null; }
        const at = Date.parse(v?.at || '') || 0;
        if (!v || v.confirmado || Date.now() - at > 3 * 3600 * 1000) this.prisma.listaItem.delete({ where: { id: p.id } }).catch(() => {});
      }

      for (const a of paraWhats) {
        // 6 variáveis do template alerta_medicacao_internacao (nesta ordem)
        const params: Array<{ type: 'text'; text: string }> = [
          { type: 'text', text: a.petNome || 'Paciente' },                        // {{1}} Paciente
          { type: 'text', text: a.tutorNome || '—' },                             // {{2}} Tutor
          { type: 'text', text: a.box || '—' },                                   // {{3}} Baia/Box
          { type: 'text', text: a.medicamento || a.descricao || 'Medicação' },    // {{4}} Medicação
          { type: 'text', text: [a.dose, a.via].filter(Boolean).join(' · ') || '—' }, // {{5}} Dose/Via
          { type: 'text', text: a.horario },                                      // {{6}} Horário previsto
        ];
        for (const vet of vets) {
          const key = `${dateKey}|${a.apptId}|${a.tipo}|${a.horario}|${vet.phone}`;
          if (doDia.has(key)) continue;
          doDia.add(key);
          try {
            await this.whatsapp.sendTemplateMessage(vet.phone, this.TEMPLATE, params);
          } catch (e) {
            this.logger.warn(`Falha ao enviar lembrete de plantão p/ ${vet.phone}: ${String((e as any)?.message || e)}`);
          }
          // marca como enviado (mesmo se falhou: evita reenvio em loop enquanto o template está pendente)
          await this.prisma.listaItem.create({ data: { lista: 'intalerta_wa_sent', valor: key } }).catch(() => {});
          // guarda um "pendente de confirmação" pra quando o vet tocar "Medicação aplicada" (marca a dose sozinho)
          await this.prisma.listaItem.create({
            data: {
              lista: 'intalerta_wa_pend',
              valor: JSON.stringify({
                phone: vet.phone, vetNome: vet.nome, apptId: a.apptId, prescId: a.prescId || '',
                medicamento: a.medicamento || '', dose: a.dose || '', via: a.via || '', horario: a.horario,
                cobrarId: a.cobrarId || '', cobrarTipo: a.cobrarTipo || '', cobrarNome: a.cobrarNome || '', cobrarValor: a.cobrarValor || 0,
                at: new Date().toISOString(), confirmado: false,
              }),
            },
          }).catch(() => {});
        }
      }
    } catch (e) {
      this.logger.error(`Erro no scheduler de alertas de plantão: ${String((e as any)?.message || e)}`);
    }
  }
}
