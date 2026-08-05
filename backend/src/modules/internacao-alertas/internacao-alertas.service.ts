import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Extrai o intervalo em HORAS do texto da frequência — aceita as frequências
// CUSTOMIZADAS de Config › Listas: "8/8h"→8, "24h (1x ao dia)"→24, "10/10h"→10,
// "48h"→48. Texto sem horas (ex.: "quando necessário") → 0 (contínua, sem horário fixo).
export function horasDaFreq(frequencia: string): number {
  const m = /(\d+)\s*\/?\s*\d*\s*h/i.exec(String(frequencia || ''));
  return m ? parseInt(m[1], 10) : 0;
}

/** "06:00" + "8/8h" → ["06:00","14:00","22:00"] (ciclo de 24h). */
export function horariosDe(primeira: string, frequencia: string): string[] {
  const h = horasDaFreq(frequencia);
  const m = /^(\d{1,2}):(\d{2})$/.exec((primeira || '').trim());
  if (!h || !m) return [];
  const ini = parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
  if (isNaN(ini) || ini < 0 || ini >= 1440) return [];
  const out: string[] = [];
  for (let t = 0; t < 1440; t += h * 60) {
    const min = (ini + t) % 1440;
    out.push(`${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`);
  }
  return out;
}

const INATIVOS = ['DISCHARGED', 'DECEASED'];

@Injectable()
export class InternacaoAlertasService {
  constructor(private readonly prisma: PrismaService) {}

  // Cache curto (por máquina) das DUAS consultas pesadas — a varredura da agenda
  // (notes contains HOSPITALIZATION) + as prescrições. O endpoint é chamado por TODO
  // usuário a cada 2 min; sem cache, cada poll disparava uma varredura da tabela inteira.
  // Com 30s de cache, vários polls simultâneos compartilham UMA varredura. O cálculo de
  // horário (a parte barata e sensível a tempo) continua sendo refeito a cada chamada.
  private baseCache: {
    at: number;
    ativos: any[];
    prescPorAppt: Record<string, any[]>;
    medFeitas: Set<string>; // `${apptId}|${prescId}|${slot}` de doses aplicadas há < 2h
    aferiFeitas: Record<string, number[]>; // apptId -> minutos locais (Fortaleza) das aferições feitas há < 2h
  } | null = null;
  private readonly BASE_TTL_MS = 30_000;
  private static readonly ATRASO_MAX_MIN = 30; // até 30 min de atraso o alerta insiste; depois para sozinho

  // minuto local de Fortaleza (UTC-3) a partir de um instante ISO
  private minutoLocal(at: string): number | null {
    const t = Date.parse(at);
    if (isNaN(t)) return null;
    const d = new Date(t);
    return ((d.getUTCHours() * 60 + d.getUTCMinutes()) - 180 + 1440) % 1440;
  }

  private async carregarBase() {
    if (this.baseCache && Date.now() - this.baseCache.at < this.BASE_TTL_MS) {
      return this.baseCache;
    }
    // 1) internações ativas
    const appts = await this.prisma.appointment.findMany({
      where: { notes: { contains: '"type":"HOSPITALIZATION"' } },
      select: { id: true, notes: true, status: true, pet: { select: { name: true } }, tutor: { select: { name: true } } },
    });
    const ativos = appts
      .map((a) => {
        let meta: any = null;
        try { meta = typeof a.notes === 'string' ? JSON.parse(a.notes) : a.notes; } catch { meta = null; }
        const box = meta?.roomNumber || meta?.box || meta?.boxNome || meta?.baia || '';
        return { id: a.id, petNome: a.pet?.name || 'Paciente', tutorNome: a.tutor?.name || '', box, meta, status: a.status };
      })
      // Exclui internações que já tiveram alta/óbito. Checa a COLUNA status do agendamento
      // (atualizada de forma confiável na alta) E o status dentro do metadata, por garantia.
      // Antes só olhava o metadata.status, que a alta não atualizava → alerta de pet com alta.
      .filter((x) => x.meta?.type === 'HOSPITALIZATION'
        && !INATIVOS.includes(String(x.status || ''))
        && !INATIVOS.includes(String(x.meta?.status || '')));

    // 2) todas as prescrições numa consulta (só se houver internação ativa)
    const prescPorAppt: Record<string, any[]> = {};
    // 3) o que já foi FEITO recentemente (< 2h) — pra o "repetir se atrasar" parar de
    //    insistir quando a dose/aferição é marcada. Janela de 2h porque só olhamos
    //    horários com até 30 min de atraso, então a marcação é sempre bem recente.
    const medFeitas = new Set<string>();
    const aferiFeitas: Record<string, number[]> = {};
    if (ativos.length) {
      const ids = ativos.map((a) => a.id);
      const prescKeys = ids.map((id) => `intpresc_${id}`);
      const medKeys = ids.map((id) => `intmed_${id}`);
      const vitalKeys = ids.map((id) => `intvital_${id}`);
      const recente = 2 * 60 * 60 * 1000;

      const [presc, med, vital] = await Promise.all([
        this.prisma.listaItem.findMany({ where: { lista: { in: prescKeys } }, select: { id: true, lista: true, valor: true } }),
        this.prisma.listaItem.findMany({ where: { lista: { in: medKeys } }, select: { lista: true, valor: true } }),
        this.prisma.listaItem.findMany({ where: { lista: { in: vitalKeys } }, select: { lista: true, valor: true } }),
      ]);

      for (const p of presc) {
        const apptId = p.lista.replace('intpresc_', '');
        let v: any = null;
        try { v = JSON.parse(p.valor); } catch { v = null; }
        if (v) (prescPorAppt[apptId] = prescPorAppt[apptId] || []).push({ ...v, _prescId: p.id });
      }
      for (const m of med) {
        const apptId = m.lista.replace('intmed_', '');
        let v: any = null;
        try { v = JSON.parse(m.valor); } catch { v = null; }
        if (v && v.at && Date.now() - Date.parse(v.at) < recente && v.prescId && v.slot) {
          medFeitas.add(`${apptId}|${v.prescId}|${v.slot}`);
        }
      }
      for (const w of vital) {
        const apptId = w.lista.replace('intvital_', '');
        let v: any = null;
        try { v = JSON.parse(w.valor); } catch { v = null; }
        if (v && v.at && Date.now() - Date.parse(v.at) < recente) {
          const min = this.minutoLocal(v.at);
          if (min != null) (aferiFeitas[apptId] = aferiFeitas[apptId] || []).push(min);
        }
      }
    }

    this.baseCache = { at: Date.now(), ativos, prescPorAppt, medFeitas, aferiFeitas };
    return this.baseCache;
  }

  /**
   * Alertas de medicação/aferição que vencem nos próximos `janelaMin` minutos,
   * de TODAS as internações ativas. As consultas pesadas vêm de `carregarBase()` (cache 30s);
   * o cálculo de horário abaixo é refeito sempre, então os alertas seguem exatos.
   */
  async proximos(janelaMin = 18) {
    const now = new Date();
    const { ativos, prescPorAppt, medFeitas, aferiFeitas } = await this.carregarBase();

    if (!ativos.length) return { agora: now.toISOString(), alertas: [] as any[] };

    const ATRASO = InternacaoAlertasService.ATRASO_MAX_MIN;
    // hora local Fortaleza (UTC-3, sem horário de verão)
    const localMin = ((now.getUTCHours() * 60 + now.getUTCMinutes()) - 180 + 1440) % 1440;
    const dueDe = (hm: number) => { let d = hm - localMin; if (d < -720) d += 1440; return d; };
    const toMin = (hhmm: string) => { const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm); return m ? parseInt(m[1], 10) * 60 + parseInt(m[2], 10) : null; };

    const alertas: any[] = [];
    for (const a of ativos) {
      const avisos = a.meta?.vitalSigns?.avisos || { popup: true, som: true, whatsapp: false, repetir: false };
      // aferições
      const cfg = a.meta?.vitalSigns?.aferiCfg;
      if (cfg?.frequencia && cfg?.primeira) {
        for (const hhmm of horariosDe(cfg.primeira, cfg.frequencia)) {
          const hm = toMin(hhmm); if (hm == null) continue;
          const d = dueDe(hm);
          const proximo = d >= 0 && d <= janelaMin;
          // aferição feita = houve registro de sinal vital perto do horário (janela do atraso)
          const feito = (aferiFeitas[a.id] || []).some((m) => m >= hm - 10 && m <= hm + ATRASO);
          const atrasado = !!avisos.repetir && d < 0 && d >= -ATRASO && !feito;
          if (proximo || atrasado) {
            alertas.push({ apptId: a.id, petNome: a.petNome, tutorNome: a.tutorNome, box: a.box, tipo: 'afericao', descricao: 'Aferição', horario: hhmm, dueInMin: d, atrasado, avisos });
          }
        }
      }
      // medicações
      for (const pr of prescPorAppt[a.id] || []) {
        const hors: any[] = Array.isArray(pr.horarios) ? pr.horarios : [];
        for (const hhmm of hors) {
          const slot = String(hhmm);
          const hm = toMin(slot); if (hm == null) continue;
          const d = dueDe(hm);
          const proximo = d >= 0 && d <= janelaMin;
          const feito = medFeitas.has(`${a.id}|${pr._prescId}|${slot}`);
          const atrasado = !!avisos.repetir && d < 0 && d >= -ATRASO && !feito;
          if (proximo || atrasado) {
            alertas.push({
              apptId: a.id, petNome: a.petNome, tutorNome: a.tutorNome, box: a.box,
              tipo: 'medicacao',
              descricao: [pr.medicamento, pr.via].filter(Boolean).join(' ') || 'Medicação',
              medicamento: pr.medicamento || 'Medicação', dose: pr.dose || '', via: pr.via || '',
              prescId: pr._prescId,
              cobrarId: pr.cobrarId || '', cobrarTipo: pr.cobrarTipo || '', cobrarNome: pr.cobrarNome || '', cobrarValor: Number(pr.cobrarValor) || 0,
              horario: slot, dueInMin: d, atrasado, avisos,
            });
          }
        }
      }
    }
    alertas.sort((x, y) => x.dueInMin - y.dueInMin);
    return { agora: now.toISOString(), alertas };
  }
}
