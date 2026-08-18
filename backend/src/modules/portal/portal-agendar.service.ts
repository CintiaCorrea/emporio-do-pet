/**
 * Agendar, desmarcar e remarcar pelo portal (Fatia 4B.3).
 *
 * O agendamento criado aqui é um `Appointment` NORMAL da agenda da equipe —
 * mesma tabela, mesmo cartão — com duas diferenças: nasce com `origem = PORTAL`
 * (a "marquinha" que a Cintia pediu) e deixa rastro em `ptl_agendamentos`.
 *
 * Regras confirmadas com a Cintia (29/07):
 * · desmarcar/remarcar até o prazo configurado; depois, só com a recepção;
 * · **remarcar NÃO conta como desmarcação** — quem remarca avisou;
 * · depois de N desmarcações seguidas, o portal trava e cobra taxa na recepção;
 * · o bloqueio não tem prazo: sai quando o cliente COMPARECE ou quando a equipe
 *   clica em "Liberar".
 *
 * A trava contra dois clientes no mesmo horário é do BANCO: índice único
 * parcial em (agenda_id, inicio) para os que estão MARCADO. Não depende de
 * timing do servidor.
 */
import { BadRequestException, ConflictException, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { PortalAgendaRegrasService } from './portal-agenda-regras.service';
import { PortalAgendaHorariosService, ymdLocal } from './portal-agenda-horarios.service';

/** Status do CRM que significam "o cliente veio". */
const COMPARECEU = ['Realizado', 'Atendido', 'COMPLETED', 'CONCLUIDO'];
const CANCELADO = ['Cancelado', 'CANCELED', 'CANCELADO'];

export interface Bloqueio {
  travado: boolean;
  desmarcacoes: number;
  limite: number;
  taxaCentavos: number;
  mensagem: string | null;
}

@Injectable()
export class PortalAgendarService {
  private readonly logger = new Logger(PortalAgendarService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly regras: PortalAgendaRegrasService,
    private readonly horarios: PortalAgendaHorariosService,
  ) {}

  // ---------------------------------------------------------------------------
  // Bloqueio por desmarcações
  // ---------------------------------------------------------------------------
  /**
   * Desde quando contamos as desmarcações: a data mais recente entre o último
   * comparecimento e a última liberação da equipe. É isso que faz a conta zerar.
   */
  private async contaZeradaEm(tutorId: string): Promise<Date | null> {
    const [compareceu, liberacao] = await Promise.all([
      this.prisma.appointment.findFirst({
        where: { tutorId, status: { in: COMPARECEU }, date: { lte: new Date() } },
        orderBy: { date: 'desc' },
        select: { date: true },
      }),
      this.prisma.portalLiberacao.findFirst({
        where: { tutorId },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      }),
    ]);

    const datas = [compareceu?.date, liberacao?.createdAt].filter(Boolean) as Date[];
    if (!datas.length) return null;
    return new Date(Math.max(...datas.map((d) => d.getTime())));
  }

  async bloqueio(tutorId: string): Promise<Bloqueio> {
    const config = await this.regras.config();
    const desde = await this.contaZeradaEm(tutorId);

    const desmarcacoes = await this.prisma.portalAgendamento.count({
      where: {
        tutorId,
        situacao: 'DESMARCADO',
        ...(desde ? { desmarcadoEm: { gt: desde } } : {}),
      },
    });

    return {
      travado: desmarcacoes >= config.desmarcacoesParaTaxa,
      desmarcacoes,
      limite: config.desmarcacoesParaTaxa,
      taxaCentavos: config.taxaCentavos,
      mensagem: config.mensagemTravado,
    };
  }

  /** Usada pela equipe: zera a conta depois de cobrar a taxa. */
  async liberar(tutorId: string, quem?: string, motivo?: string) {
    await this.prisma.portalLiberacao.create({
      data: { tutorId, liberadoPor: quem || null, motivo: motivo || null },
    });
    return this.bloqueio(tutorId);
  }

  /** Quem está travado agora — a lista que aparece na tela de regras. */
  async travados() {
    const config = await this.regras.config();
    const candidatos = await this.prisma.portalAgendamento.groupBy({
      by: ['tutorId'],
      where: { situacao: 'DESMARCADO' },
      _count: { _all: true },
    });

    const lista: Array<{ tutorId: string; nome: string; desmarcacoes: number }> = [];
    for (const c of candidatos) {
      if (c._count._all < config.desmarcacoesParaTaxa) continue; // nem com tudo daria
      const b = await this.bloqueio(c.tutorId);
      if (!b.travado) continue;
      const tutor = await this.prisma.tutor.findUnique({
        where: { id: c.tutorId },
        select: { name: true },
      });
      lista.push({ tutorId: c.tutorId, nome: tutor?.name || '(cadastro removido)', desmarcacoes: b.desmarcacoes });
    }
    return lista;
  }

  // ---------------------------------------------------------------------------
  // O que a tela Agendar mostra
  // ---------------------------------------------------------------------------
  async opcoes(tutorId: string) {
    const [{ config, servicos, agendas }, bloqueio] = await Promise.all([
      this.regras.paraTela(),
      this.bloqueio(tutorId),
    ]);
    const porId = new Map(agendas.map((a) => [a.id, a]));

    return {
      ativo: config.ativo,
      bloqueio,
      prazoCancelarHoras: config.prazoCancelarHoras,
      servicos: servicos
        .filter((s) => s.ativo)
        .map((s) => {
          // Só PROFISSIONAIS (não salas/MAP) podem ser escolhidos pelo cliente.
          // Serviço de sala (fisio) volta com lista vazia → a tela não pergunta.
          const profissionais = s.agendas
            .map((id) => porId.get(id))
            .filter((a): a is NonNullable<typeof a> => !!a && a.origem === 'profissional')
            .map((a) => ({ id: a.id, nome: a.nome }));
          return { tipo: s.tipo, rotulo: s.rotulo, duracaoMin: s.duracaoMin, profissionais };
        }),
    };
  }

  // ---------------------------------------------------------------------------
  // Marcar
  // ---------------------------------------------------------------------------
  /**
   * Cria o agendamento. Confere TUDO de novo neste instante — a lista de
   * horários que o cliente está vendo pode ter minutos de vida.
   */
  async agendar(
    tutorId: string,
    dados: { petId: string; tipo: string; inicio: string; agenda?: string },
    ip?: string,
  ) {
    const bloqueio = await this.bloqueio(tutorId);
    if (bloqueio.travado) {
      throw new BadRequestException(
        bloqueio.mensagem || 'Para marcar seu próximo horário, fale com a nossa recepção.',
      );
    }

    const inicio = new Date(dados.inicio);
    if (Number.isNaN(inicio.getTime())) throw new BadRequestException('Horário inválido');

    const { servicos } = await this.regras.paraTela();
    const servico = servicos.find((s) => s.tipo === dados.tipo);
    if (!servico?.ativo) throw new BadRequestException('Esse atendimento não está disponível.');

    // Reconferência: o horário ainda tem que estar na lista de livres. Se o cliente
    // escolheu um profissional, filtramos por ele — assim a vaga reservada é a DELE,
    // não a "primeira livre" no mesmo horário.
    const dia = await this.horarios.horariosDoDia(
      tutorId,
      dados.petId,
      dados.tipo,
      ymdLocal(inicio),
      dados.agenda,
    );
    const vaga = dia.horarios.find((h) => h.inicioUtc.getTime() === inicio.getTime());
    if (!vaga) {
      throw new ConflictException('Esse horário acabou de ser preenchido. Escolha outro, por favor.');
    }

    // Quem é o responsável no CRM (todo agendamento exige um).
    const responsavel = await this.responsavelDaAgenda(vaga.agendaId, servico, inicio);
    if (!responsavel) {
      throw new BadRequestException(
        'Não há profissional responsável configurado para esse atendimento. Fale com a recepção.',
      );
    }

    const ehSala = responsavel.ehSala;

    try {
      // O rastro do portal entra PRIMEIRO: é ele que carrega o índice único e
      // recusa dois clientes no mesmo horário. Se falhar aqui, nada foi criado
      // na agenda da equipe.
      const appointmentId = randomUUID();

      const registro = await this.prisma.portalAgendamento.create({
        data: {
          appointmentId,
          tutorId,
          petId: dados.petId,
          tipo: dados.tipo,
          agendaId: vaga.agendaId,
          inicio,
          duracaoMin: servico.duracaoMin,
          situacao: 'MARCADO',
          ip,
        },
      });

      await this.prisma.appointment.create({
        data: {
          id: appointmentId,
          tutorId,
          petId: dados.petId,
          userId: responsavel.userId,
          date: inicio,
          duration: servico.duracaoMin,
          type: dados.tipo,
          status: 'Agendado',
          origem: 'PORTAL', // ⭐ a marquinha na agenda da equipe
          ...(ehSala ? { agendaAvulsa: vaga.agendaId } : {}),
        },
      });

      return {
        id: registro.id,
        appointmentId,
        inicio,
        duracaoMin: servico.duracaoMin,
        agendaNome: vaga.agendaNome,
      };
    } catch (e) {
      // P2002 = o índice único barrou: alguém confirmou primeiro.
      if ((e as { code?: string }).code === 'P2002') {
        throw new ConflictException(
          'Esse horário acabou de ser preenchido. Escolha outro, por favor.',
        );
      }
      throw e;
    }
  }

  /** Profissional que assina o agendamento; e se a agenda é sala. */
  private async responsavelDaAgenda(
    agendaId: string,
    servico: { responsavelUserId?: string | null; responsavelPorDia?: Record<string, string> | null },
    inicio: Date,
  ): Promise<{ userId: string; ehSala: boolean } | null> {
    const prof = await this.prisma.profissional.findFirst({
      where: { id: agendaId, ativo: true },
      select: { userId: true },
    });
    if (prof?.userId) return { userId: prof.userId, ehSala: false };

    // Sala/parceiro: o responsável POR DIA (1=seg..6=sáb, no fuso de Fortaleza) tem
    // prioridade; sem regra do dia, cai no responsável fixo do serviço.
    const [ay, am, ad] = ymdLocal(inicio).split('-').map(Number);
    const diaSemana = new Date(Date.UTC(ay, am - 1, ad)).getUTCDay(); // 0=dom..6=sáb
    const doDia = servico.responsavelPorDia?.[String(diaSemana)] || null;
    const alvo = doDia || servico.responsavelUserId || null;
    if (alvo) {
      const existe = await this.prisma.user.findUnique({
        where: { id: alvo },
        select: { id: true },
      });
      if (existe) return { userId: existe.id, ehSala: true };
    }
    return null;
  }

  // ---------------------------------------------------------------------------
  // Meus horários / desmarcar / remarcar
  // ---------------------------------------------------------------------------
  async meus(tutorId: string) {
    const config = await this.regras.config();

    const registros = await this.prisma.portalAgendamento.findMany({
      where: { tutorId, situacao: 'MARCADO', inicio: { gte: new Date() } },
      orderBy: { inicio: 'asc' },
      take: 20,
    });

    const appts = await this.prisma.appointment.findMany({
      where: { id: { in: registros.map((r) => r.appointmentId) } },
      select: { id: true, status: true, pet: { select: { name: true } } },
    });
    const porId = new Map(appts.map((a) => [a.id, a]));

    const { servicos } = await this.regras.paraTela();
    const rotulo = new Map(servicos.map((s) => [s.tipo, s.rotulo]));

    return registros
      // Se a equipe cancelou pelo sistema, não mostramos como ativo.
      .filter((r) => {
        const a = porId.get(r.appointmentId);
        return a && !CANCELADO.includes(a.status);
      })
      .map((r) => {
        const limite = new Date(r.inicio.getTime() - config.prazoCancelarHoras * 60 * 60_000);
        return {
          id: r.id,
          petNome: porId.get(r.appointmentId)?.pet?.name || '',
          tipo: r.tipo,
          rotulo: rotulo.get(r.tipo) || r.tipo,
          inicio: r.inicio,
          duracaoMin: r.duracaoMin,
          podeMexerAte: limite,
          podeMexer: Date.now() < limite.getTime(),
        };
      });
  }

  private async buscarMeu(tutorId: string, id: string) {
    const registro = await this.prisma.portalAgendamento.findFirst({
      where: { id, tutorId, situacao: 'MARCADO' },
    });
    if (!registro) throw new BadRequestException('Agendamento não encontrado.');

    const config = await this.regras.config();
    const limite = registro.inicio.getTime() - config.prazoCancelarHoras * 60 * 60_000;
    if (Date.now() >= limite) {
      throw new BadRequestException(
        `Faltam menos de ${config.prazoCancelarHoras}h para o horário. Fale com a nossa recepção que a gente resolve. 💬`,
      );
    }
    return registro;
  }

  /**
   * Desmarca. CONTA como desmarcação (é o que aciona a taxa).
   * O horário volta a ficar livre na hora, para outro cliente pegar.
   */
  async desmarcar(tutorId: string, id: string) {
    const registro = await this.buscarMeu(tutorId, id);

    await this.prisma.portalAgendamento.update({
      where: { id: registro.id },
      data: { situacao: 'DESMARCADO', desmarcadoEm: new Date() },
    });
    await this.prisma.appointment
      .update({ where: { id: registro.appointmentId }, data: { status: 'Cancelado' } })
      .catch((e) => this.logger.warn(`Agendamento ${registro.appointmentId}: ${e.message}`));

    return { desmarcado: true, bloqueio: await this.bloqueio(tutorId) };
  }

  /**
   * Remarca: solta o horário antigo e pega o novo em um passo.
   * NÃO conta como desmarcação (decisão da Cintia) — quem remarca avisou.
   */
  async remarcar(tutorId: string, id: string, novoInicio: string, ip?: string) {
    const registro = await this.buscarMeu(tutorId, id);

    // Libera o antigo primeiro: sem isso o índice único poderia barrar a troca
    // de horário dentro da mesma agenda.
    await this.prisma.portalAgendamento.update({
      where: { id: registro.id },
      data: { situacao: 'REMARCADO', desmarcadoEm: new Date() },
    });
    await this.prisma.appointment
      .update({ where: { id: registro.appointmentId }, data: { status: 'Cancelado' } })
      .catch(() => undefined);

    try {
      const novo = await this.agendar(
        tutorId,
        { petId: registro.petId, tipo: registro.tipo, inicio: novoInicio },
        ip,
      );
      await this.prisma.portalAgendamento.update({
        where: { id: registro.id },
        data: { remarcadoParaId: novo.id },
      });
      return novo;
    } catch (e) {
      // Deu errado no novo horário: devolve o antigo em vez de deixar o cliente
      // sem nada.
      await this.prisma.portalAgendamento.update({
        where: { id: registro.id },
        data: { situacao: 'MARCADO', desmarcadoEm: null },
      });
      await this.prisma.appointment
        .update({ where: { id: registro.appointmentId }, data: { status: 'Agendado' } })
        .catch(() => undefined);
      throw e;
    }
  }
}
