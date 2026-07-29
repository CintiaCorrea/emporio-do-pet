/**
 * Motor de horários livres do agendamento online (Fatia 4B.2).
 *
 * É o coração do autoatendimento: dado um pet e um serviço, diz QUAIS horários
 * existem de verdade. Se este arquivo errar, o cliente marca em cima de alguém.
 *
 * O que ele respeita, nesta ordem:
 *  1. as regras da equipe (serviço ligado, antecedência, janela de dias, teto/dia);
 *  2. a escala de quem atende — mesmo formato lido pelo login e pela agenda:
 *     `{ semana: { "1": [["08:00","12:00"], ...] }, bloqueios: [{inicio, fim}] }`;
 *  3. o que já está marcado naquela agenda (cancelado libera o horário);
 *  4. **a trava do pet bravo**: um pet com temperamento que trava ocupa a SALA
 *     inteira (todas as agendas do mesmo grupo), nos dois sentidos — nem ele
 *     entra onde há outro, nem outro entra onde ele está.
 *
 * Fuso: a clínica é de Fortaleza (UTC-3, sem horário de verão). O banco guarda
 * em UTC; aqui converte-se explicitamente para não oferecer 5h da manhã.
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PortalAgendaRegrasService } from './portal-agenda-regras.service';

/** Fortaleza = UTC-3 o ano inteiro. */
const FUSO_HORAS = 3;

export interface HorarioLivre {
  /** "14:30" no horário da clínica. */
  hora: string;
  /** Início em UTC — é o que vai virar o agendamento. */
  inicioUtc: Date;
  agendaId: string;
  agendaNome: string;
}

export interface DiaComHorarios {
  data: string; // YYYY-MM-DD
  horarios: HorarioLivre[];
}

export type MotivoSemHorario =
  | 'AGENDAMENTO_DESLIGADO'
  | 'SERVICO_NAO_LIBERADO'
  | 'SEM_AGENDA_CONFIGURADA'
  | 'PRECISA_SER_CLIENTE'
  | 'PRECISA_TER_PACOTE'
  | 'LIMITE_DO_DIA';

export class SemHorarios extends Error {
  constructor(public readonly motivo: MotivoSemHorario) {
    super(motivo);
  }
}

interface Agenda {
  id: string;
  nome: string;
  origem: 'profissional' | 'sala';
  grupo: string | null;
  /** userId do profissional — é por ele que casamos os agendamentos. */
  userId: string | null;
  escala: unknown;
}

// ---------------------------------------------------------------------------
// Ajudantes de data/hora (todos explícitos sobre fuso)
// ---------------------------------------------------------------------------
export function hmParaMinutos(v: unknown): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(v ?? '').trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

export function minutosParaHm(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
}

/** "2026-08-03" + 480min (08:00 na clínica) -> Date em UTC. */
export function localParaUtc(ymd: string, minutos: number): Date {
  const [a, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, d, 0, 0, 0) + (minutos + FUSO_HORAS * 60) * 60_000);
}

/** Date (UTC) -> "2026-08-03" no calendário da clínica. */
export function ymdLocal(data: Date): string {
  const d = new Date(data.getTime() - FUSO_HORAS * 60 * 60_000);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

/** Minutos desde a meia-noite da clínica. */
export function minutosLocal(data: Date): number {
  const d = new Date(data.getTime() - FUSO_HORAS * 60 * 60_000);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}

export function diaDaSemanaLocal(ymd: string): number {
  const [a, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, d)).getUTCDay(); // 0 = domingo
}

function normalizarEscala(v: unknown): { semana?: Record<string, unknown>; bloqueios?: unknown[] } | null {
  let o: unknown = v;
  if (typeof v === 'string') {
    try {
      o = JSON.parse(v);
    } catch {
      return null;
    }
  }
  return o && typeof o === 'object' ? (o as any) : null;
}

@Injectable()
export class PortalAgendaHorariosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly regras: PortalAgendaRegrasService,
  ) {}

  /** Temperamentos que fazem o pet ocupar a sala inteira (Configurações › Agenda). */
  private async temperamentosQueTravam(): Promise<string[]> {
    const item = await this.prisma.listaItem.findFirst({
      where: { lista: 'agenda_config' },
      select: { valor: true },
    });
    if (!item) return [];
    try {
      const cfg = JSON.parse(item.valor);
      return Array.isArray(cfg?.temperamentosQueTravam) ? cfg.temperamentosQueTravam.map(String) : [];
    } catch {
      return [];
    }
  }

  /** Agendas (profissional/sala) com escala, pelos ids salvos na regra do serviço. */
  private async agendasPorId(ids: string[]): Promise<Agenda[]> {
    if (!ids.length) return [];

    const [profissionais, avulsas] = await Promise.all([
      this.prisma.profissional.findMany({
        where: { id: { in: ids }, ativo: true },
        select: { id: true, nomeExibicao: true, nomeCompleto: true, userId: true, escala: true },
      }),
      this.prisma.listaItem.findMany({ where: { lista: 'agenda_avulsa' }, select: { id: true, valor: true } }),
    ]);

    const lista: Agenda[] = profissionais.map((p) => ({
      id: p.id,
      nome: p.nomeExibicao || p.nomeCompleto,
      origem: 'profissional',
      grupo: null,
      userId: p.userId,
      escala: p.escala,
    }));

    for (const a of avulsas) {
      try {
        const v = JSON.parse(a.valor);
        const id = String(v.id || a.id);
        if (!ids.includes(id) || v?.ativo === false) continue;
        lista.push({
          id,
          nome: String(v.nome || 'Agenda'),
          origem: 'sala',
          grupo: v.grupo ? String(v.grupo) : null,
          userId: null,
          // Na agenda avulsa a escala mora em `horario`.
          escala: v.horario ?? v.escala ?? null,
        });
      } catch {
        // item fora do formato: ignora
      }
    }

    return lista;
  }

  /** Janelas de trabalho (em minutos) daquela agenda naquele dia. */
  private janelasDoDia(agenda: Agenda, ymd: string): Array<[number, number]> {
    const esc = normalizarEscala(agenda.escala);
    // Sem escala cadastrada NÃO abrimos a agenda para o cliente: o portal só
    // oferece o que a clínica declarou. (Na tela da equipe, sem escala a coluna
    // aparece o dia inteiro — lá tem gente decidindo; aqui, não.)
    if (!esc?.semana || !Object.keys(esc.semana).length) return [];

    const bloqueado = Array.isArray(esc.bloqueios)
      ? esc.bloqueios.some(
          (b: any) => b?.inicio && ymd >= b.inicio && (!b.fim || ymd <= b.fim),
        )
      : false;
    if (bloqueado) return [];

    const dow = diaDaSemanaLocal(ymd);
    const janelas: any[] = (esc.semana as any)[String(dow)] || [];
    const saida: Array<[number, number]> = [];
    for (const par of janelas) {
      const ini = hmParaMinutos(par?.[0]);
      const fim = hmParaMinutos(par?.[1]);
      if (ini == null || fim == null || fim <= ini) continue;
      saida.push([ini, fim]);
    }
    return saida;
  }

  /**
   * Agendamentos do dia, já com o que interessa: em qual agenda estão, quando
   * começam/terminam e se o pet trava a sala.
   */
  private async ocupacaoDoDia(ymd: string, travam: string[]) {
    const inicio = localParaUtc(ymd, 0);
    const fim = localParaUtc(ymd, 24 * 60);

    const appts = await this.prisma.appointment.findMany({
      where: {
        date: { gte: inicio, lt: fim },
        status: { notIn: ['Cancelado', 'CANCELED', 'CANCELADO'] },
      },
      select: {
        id: true,
        date: true,
        duration: true,
        userId: true,
        agendaAvulsa: true,
        pet: { select: { temperament: true } },
      },
    });

    return appts.map((a) => {
      const ini = minutosLocal(a.date);
      return {
        inicio: ini,
        fim: ini + (a.duration || 30),
        userId: a.userId,
        agendaAvulsa: a.agendaAvulsa,
        travaSala: !!a.pet?.temperament && travam.includes(a.pet.temperament),
      };
    });
  }

  /**
   * Horários livres de um dia. Lança `SemHorarios` quando o motivo é de regra
   * (serviço desligado, cliente sem pacote...) — a tela mostra a explicação
   * certa em vez de "nenhum horário".
   */
  async horariosDoDia(
    tutorId: string,
    petId: string,
    tipo: string,
    ymd: string,
  ): Promise<DiaComHorarios> {
    const { config, servicos } = await this.regras.paraTela();
    if (!config.ativo) throw new SemHorarios('AGENDAMENTO_DESLIGADO');

    const servico = servicos.find((s) => s.tipo === tipo);
    if (!servico || !servico.ativo) throw new SemHorarios('SERVICO_NAO_LIBERADO');
    if (!servico.agendas.length) throw new SemHorarios('SEM_AGENDA_CONFIGURADA');

    // --- restrições do serviço ---------------------------------------------
    if (servico.restricao === 'TEM_PACOTE') {
      const pacote = await this.prisma.pacote.findFirst({
        where: { petId, status: 'ATIVO' },
        select: { id: true, totalSessoes: true, sessoesUsadas: true },
      });
      if (!pacote || pacote.sessoesUsadas >= pacote.totalSessoes) {
        throw new SemHorarios('PRECISA_TER_PACOTE');
      }
    }
    if (servico.restricao === 'JA_CLIENTE') {
      const atendido = await this.prisma.appointment.count({
        where: { tutorId, date: { lt: new Date() } },
      });
      if (atendido === 0) throw new SemHorarios('PRECISA_SER_CLIENTE');
    }

    // --- teto por cliente por dia ------------------------------------------
    const jaNoDia = await this.prisma.appointment.count({
      where: {
        tutorId,
        date: { gte: localParaUtc(ymd, 0), lt: localParaUtc(ymd, 24 * 60) },
        status: { notIn: ['Cancelado', 'CANCELED', 'CANCELADO'] },
      },
    });
    if (jaNoDia >= config.maxPorDia) throw new SemHorarios('LIMITE_DO_DIA');

    // --- janela permitida ---------------------------------------------------
    const agora = Date.now();
    const minimo = agora + config.antecedenciaMinHoras * 60 * 60_000;
    const maximo = agora + config.janelaDias * 24 * 60 * 60_000;

    const [agendas, travam, pet] = await Promise.all([
      this.agendasPorId(servico.agendas),
      this.temperamentosQueTravam(),
      this.prisma.pet.findUnique({ where: { id: petId }, select: { temperament: true } }),
    ]);
    if (!agendas.length) return { data: ymd, horarios: [] };

    const petTrava = !!pet?.temperament && travam.includes(pet.temperament);
    const ocupacao = await this.ocupacaoDoDia(ymd, travam);
    const duracao = servico.duracaoMin;

    const horarios: HorarioLivre[] = [];

    for (const agenda of agendas) {
      // Profissional sem login vinculado: não dá para saber com segurança o que
      // é dele na agenda, então não oferecemos (melhor faltar horário que dar
      // horário ocupado).
      if (agenda.origem === 'profissional' && !agenda.userId) continue;

      const doGrupo = agenda.grupo
        ? agendas.filter((x) => x.grupo === agenda.grupo)
        : [agenda];

      for (const [abre, fecha] of this.janelasDoDia(agenda, ymd)) {
        for (let inicio = abre; inicio + duracao <= fecha; inicio += duracao) {
          const fimSlot = inicio + duracao;
          const inicioUtc = localParaUtc(ymd, inicio);

          if (inicioUtc.getTime() < minimo || inicioUtc.getTime() > maximo) continue;

          const conflita = (marcado: (typeof ocupacao)[number], alvo: Agenda) => {
            const mesmaAgenda =
              alvo.origem === 'profissional'
                ? marcado.userId === alvo.userId && !marcado.agendaAvulsa
                : marcado.agendaAvulsa === alvo.id;
            if (!mesmaAgenda) return false;
            return marcado.inicio < fimSlot && marcado.fim > inicio;
          };

          // 1) a própria agenda tem que estar livre
          if (ocupacao.some((m) => conflita(m, agenda))) continue;

          // 2) alguém do MESMO GRUPO com pet bravo bloqueia todo o grupo
          const grupoTravado = ocupacao.some(
            (m) => m.travaSala && doGrupo.some((g) => conflita(m, g)),
          );
          if (grupoTravado) continue;

          // 3) se ESTE pet trava, o grupo inteiro precisa estar vazio
          if (petTrava && doGrupo.some((g) => ocupacao.some((m) => conflita(m, g)))) continue;

          horarios.push({
            hora: minutosParaHm(inicio),
            inicioUtc,
            agendaId: agenda.id,
            agendaNome: agenda.nome,
          });
        }
      }
    }

    // Mesma hora em duas agendas: mostra uma vez só (a primeira), para o cliente
    // escolher horário, não profissional.
    const vistos = new Set<string>();
    const unicos = horarios
      .sort((a, b) => a.inicioUtc.getTime() - b.inicioUtc.getTime())
      .filter((h) => {
        if (vistos.has(h.hora)) return false;
        vistos.add(h.hora);
        return true;
      });

    return { data: ymd, horarios: unicos };
  }

  /** Próximos dias que têm alguma vaga — é o que a tela Agendar mostra. */
  async proximosDias(
    tutorId: string,
    petId: string,
    tipo: string,
    quantosDias = 14,
  ): Promise<DiaComHorarios[]> {
    const dias: DiaComHorarios[] = [];
    const hoje = new Date();

    for (let i = 0; i < quantosDias; i++) {
      const d = new Date(hoje.getTime() + i * 24 * 60 * 60_000);
      const ymd = ymdLocal(d);
      try {
        const dia = await this.horariosDoDia(tutorId, petId, tipo, ymd);
        if (dia.horarios.length) dias.push(dia);
      } catch (e) {
        // Motivo de regra (serviço desligado, sem pacote...) vale para todos os
        // dias — não adianta continuar procurando.
        if (e instanceof SemHorarios && e.motivo !== 'LIMITE_DO_DIA') throw e;
      }
    }

    return dias;
  }
}
