/**
 * Regras do agendamento online (Fatia 4B.1) — o painel da EQUIPE.
 *
 * Nada aqui e decidido no codigo: os prazos, a taxa e o que cada servico
 * permite sao editados na tela. O codigo so guarda o padrao de quando ainda
 * nao existe regra nenhuma — e o padrao e sempre o mais fechado:
 * agendamento online DESLIGADO e todo servico DESLIGADO.
 *
 * De onde vem a lista de opcoes (leitura do CRM, sem escrever nada la):
 * · servicos  -> `lista_itens`, lista `atendimento_tipo`, valor JSON {v, l}
 * · agendas   -> `Profissional` ativos + `lista_itens`, lista `agenda_avulsa`
 *                (as colunas "Sala MAP", parceiros etc.)
 */
import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const ID_UNICO = 'unico';
const RESTRICOES = ['TODOS', 'JA_CLIENTE', 'TEM_PACOTE'] as const;
type Restricao = (typeof RESTRICOES)[number];

export interface ServicoDaTela {
  tipo: string;
  rotulo: string;
  ativo: boolean;
  duracaoMin: number;
  agendas: string[];
  restricao: Restricao;
}

export interface OpcaoAgenda {
  id: string;
  nome: string;
  /** profissional | sala — só para agrupar na tela. */
  origem: 'profissional' | 'sala';
  grupo: string | null;
}

/** Limites de sanidade: impedem regra impossivel (0 min, 5 anos de janela). */
const LIMITES = {
  antecedenciaMinHoras: [0, 720],
  janelaDias: [1, 365],
  prazoCancelarHoras: [0, 720],
  maxPorDia: [1, 20],
  desmarcacoesParaTaxa: [1, 20],
  taxaCentavos: [0, 1_000_00],
  duracaoMin: [5, 480],
} as const;

function dentro(valor: number, faixa: readonly [number, number] | number[], nome: string) {
  const n = Math.round(Number(valor));
  if (!Number.isFinite(n) || n < faixa[0] || n > faixa[1]) {
    throw new BadRequestException(`${nome}: use um valor entre ${faixa[0]} e ${faixa[1]}`);
  }
  return n;
}

@Injectable()
export class PortalAgendaRegrasService {
  constructor(private readonly prisma: PrismaService) {}

  /** Config atual; cria a linha padrao na primeira vez que alguem abre a tela. */
  async config() {
    const existente = await this.prisma.portalAgendaConfig.findUnique({ where: { id: ID_UNICO } });
    if (existente) return existente;
    return this.prisma.portalAgendaConfig.create({
      data: {
        id: ID_UNICO,
        mensagemTravado:
          'Para marcar seu próximo horário, fale com a nossa recepção — a gente resolve rapidinho. 💬',
      },
    });
  }

  /** Tipos de atendimento cadastrados pela equipe (a fonte da lista de servicos). */
  private async tiposDeAtendimento(): Promise<Array<{ v: string; l: string }>> {
    const itens = await this.prisma.listaItem.findMany({
      where: { lista: 'atendimento_tipo', ativo: true },
      select: { valor: true, ordem: true },
      orderBy: { ordem: 'asc' },
    });

    const tipos: Array<{ v: string; l: string }> = [];
    for (const item of itens) {
      try {
        const t = JSON.parse(item.valor);
        if (t?.v) tipos.push({ v: String(t.v), l: String(t.l || t.v) });
      } catch {
        // tipos antigos podiam ser texto puro
        if (item.valor) tipos.push({ v: item.valor, l: item.valor });
      }
    }
    return tipos;
  }

  /** Colunas da agenda: profissionais + salas/parceiros (agendas avulsas). */
  async opcoesDeAgenda(): Promise<OpcaoAgenda[]> {
    const [profissionais, avulsas] = await Promise.all([
      this.prisma.profissional.findMany({
        where: { ativo: true },
        select: { id: true, nomeExibicao: true, nomeCompleto: true },
        orderBy: { nomeCompleto: 'asc' },
      }),
      this.prisma.listaItem.findMany({
        where: { lista: 'agenda_avulsa' },
        select: { id: true, valor: true },
      }),
    ]);

    const opcoes: OpcaoAgenda[] = profissionais.map((p) => ({
      id: p.id,
      nome: p.nomeExibicao || p.nomeCompleto,
      origem: 'profissional',
      grupo: null,
    }));

    for (const a of avulsas) {
      try {
        const v = JSON.parse(a.valor);
        if (v?.ativo === false) continue;
        opcoes.push({
          id: String(v.id || a.id),
          nome: String(v.nome || 'Agenda'),
          origem: 'sala',
          grupo: v.grupo ? String(v.grupo) : null,
        });
      } catch {
        // item fora do formato: ignorar em vez de quebrar a tela
      }
    }

    return opcoes;
  }

  /**
   * Tudo que a tela precisa. Os servicos vem SEMPRE da lista de tipos de
   * atendimento — servico novo cadastrado pela equipe aparece aqui sozinho,
   * desligado, sem ninguem mexer em codigo.
   */
  async paraTela() {
    const [config, tipos, salvos, agendas] = await Promise.all([
      this.config(),
      this.tiposDeAtendimento(),
      this.prisma.portalAgendaServico.findMany(),
      this.opcoesDeAgenda(),
    ]);

    const porTipo = new Map(salvos.map((s) => [s.tipo, s]));

    const servicos: ServicoDaTela[] = tipos.map((t, i) => {
      const s = porTipo.get(t.v);
      return {
        tipo: t.v,
        rotulo: t.l,
        ativo: s?.ativo ?? false,
        duracaoMin: s?.duracaoMin ?? 30,
        agendas: s?.agendas ?? [],
        restricao: (s?.restricao as Restricao) ?? 'TODOS',
        ordem: s?.ordem ?? i,
      } as ServicoDaTela;
    });

    return { config, servicos, agendas };
  }

  async salvar(
    corpo: {
      config?: Partial<Record<string, unknown>>;
      servicos?: Array<{
        tipo: string;
        ativo?: boolean;
        duracaoMin?: number;
        agendas?: string[];
        restricao?: string;
      }>;
    },
    quem?: string,
  ) {
    const c = corpo?.config || {};
    const dados: Record<string, unknown> = { atualizadoPor: quem || null };

    if ('ativo' in c) dados.ativo = !!c.ativo;
    if ('antecedenciaMinHoras' in c)
      dados.antecedenciaMinHoras = dentro(
        Number(c.antecedenciaMinHoras),
        LIMITES.antecedenciaMinHoras,
        'Antecedência mínima',
      );
    if ('janelaDias' in c)
      dados.janelaDias = dentro(Number(c.janelaDias), LIMITES.janelaDias, 'Pode marcar até');
    if ('prazoCancelarHoras' in c)
      dados.prazoCancelarHoras = dentro(
        Number(c.prazoCancelarHoras),
        LIMITES.prazoCancelarHoras,
        'Prazo para desmarcar',
      );
    if ('maxPorDia' in c)
      dados.maxPorDia = dentro(Number(c.maxPorDia), LIMITES.maxPorDia, 'Máximo por cliente por dia');
    if ('desmarcacoesParaTaxa' in c)
      dados.desmarcacoesParaTaxa = dentro(
        Number(c.desmarcacoesParaTaxa),
        LIMITES.desmarcacoesParaTaxa,
        'Desmarcações para travar',
      );
    if ('taxaCentavos' in c)
      dados.taxaCentavos = dentro(Number(c.taxaCentavos), LIMITES.taxaCentavos, 'Taxa de agendamento');
    if ('mensagemTravado' in c) {
      const m = String(c.mensagemTravado ?? '').trim();
      dados.mensagemTravado = m || null;
    }

    await this.config(); // garante a linha
    const config = await this.prisma.portalAgendaConfig.update({
      where: { id: ID_UNICO },
      data: dados,
    });

    // Serviços: um upsert por linha da tela.
    const tiposValidos = new Set((await this.tiposDeAtendimento()).map((t) => t.v));
    const opcoes = new Set((await this.opcoesDeAgenda()).map((o) => o.id));

    for (const s of corpo?.servicos || []) {
      if (!s?.tipo || !tiposValidos.has(s.tipo)) continue; // ignora tipo inexistente

      const duracao = dentro(Number(s.duracaoMin ?? 30), LIMITES.duracaoMin, 'Duração');
      const restricao: Restricao = RESTRICOES.includes(s.restricao as Restricao)
        ? (s.restricao as Restricao)
        : 'TODOS';
      // So agendas que existem — evita guardar profissional demitido/sala apagada.
      const agendas = (s.agendas || []).filter((id) => opcoes.has(id));
      const ativo = !!s.ativo;

      if (ativo && agendas.length === 0) {
        throw new BadRequestException(
          `Escolha ao menos uma agenda para "${s.tipo}" antes de liberar para o cliente.`,
        );
      }

      await this.prisma.portalAgendaServico.upsert({
        where: { tipo: s.tipo },
        create: { tipo: s.tipo, ativo, duracaoMin: duracao, agendas, restricao },
        update: { ativo, duracaoMin: duracao, agendas, restricao },
      });
    }

    return { salvo: true, config };
  }
}
