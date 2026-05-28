import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface DashboardSummary {
  // ERP
  totalTutores: number;
  totalPets: number;
  totalClientes: number;
  agendamentosHoje: number;
  consultasHoje: number;
  consultasPendentes: number;
  internacoesAtivas: number;
  // Financeiro
  faturamentoMes: number;
  faturamentoHoje: number;
  ticketMedio: number;
  comissoesPendentes: number;
  // CRM
  leadsNovos: number;
  leadsQualificados: number;
  taxaConversao: number;
  // Campanhas
  campanhasAtivas: number;
  emailsEnviados: number;
  taxaAbertura: number;
  // AI Agents (placeholder - pode ser integrado depois)
  agentesAtivos: number;
  interacoesHoje: number;
  taxaSucessoAgentes: number;
  // Estoque
  produtosBaixoEstoque: number;
  alertasEstoque: number;
}

export interface RecentActivity {
  id: string;
  tipo: string;
  titulo: string;
  descricao: string;
  tempo: string;
  icone: string;
  cor: string;
  createdAt: Date;
}

export interface UpcomingAppointment {
  id: string;
  horario: string;
  tutor: string;
  pet: string;
  servico: string;
  status: 'confirmado' | 'pendente' | 'em_atendimento';
}

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getSummary(userId: string): Promise<DashboardSummary> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Parallel queries for better performance
    const [
      totalTutores,
      totalPets,
      totalClientes,
      agendamentosHoje,
      consultasPendentes,
      faturamentoMesData,
      faturamentoHojeData,
      comissoesPendentesData,
      produtosBaixoEstoque,
      newslettersAtivas,
      emailsEnviadosData,
    ] = await Promise.all([
      // Total tutores
      this.prisma.tutor.count(),

      // Total pets
      this.prisma.pet.count(),

      // Total clientes (Tutor com classificacao=Cliente)
      this.prisma.tutor.count({ where: { classificacao: 'Cliente' } }),

      // Agendamentos hoje
      this.prisma.appointment.count({
        where: {
          date: {
            gte: todayStart,
            lt: todayEnd,
          },
        },
      }),

      // Consultas pendentes (status SCHEDULED)
      this.prisma.appointment.count({
        where: {
          date: {
            gte: todayStart,
            lt: todayEnd,
          },
          status: 'SCHEDULED',
        },
      }),

      // Faturamento do mês (receitas pagas)
      this.prisma.financeEntry.aggregate({
        where: {
          userId,
          type: 'INCOME',
          status: 'PAID',
          date: {
            gte: monthStart,
            lte: monthEnd,
          },
        },
        _sum: {
          amountCents: true,
        },
      }),

      // Faturamento hoje
      this.prisma.financeEntry.aggregate({
        where: {
          userId,
          type: 'INCOME',
          status: 'PAID',
          date: {
            gte: todayStart,
            lt: todayEnd,
          },
        },
        _sum: {
          amountCents: true,
        },
      }),

      // Comissões pendentes (appointments com paymentStatus PENDING)
      this.prisma.appointment.aggregate({
        where: {
          paymentStatus: 'PENDING',
        },
        _sum: {
          value: true,
        },
      }),

      // Produtos com baixo estoque (< 10 unidades)
      this.prisma.product.count({
        where: {
          stock: {
            lt: 10,
          },
        },
      }),

      // Newsletters ativas (DRAFT ou SCHEDULED)
      this.prisma.newsletter.count({
        where: {
          status: {
            in: ['DRAFT', 'SCHEDULED'],
          },
        },
      }),

      // Total de emails enviados (conta logs de newsletter)
      this.prisma.newsletterLog.count(),
    ]);

    // Internações ativas (appointments com notes contendo type: HOSPITALIZATION e status não finalizado)
    // Como não temos uma query JSON nativa, buscamos todos e filtramos
    const allAppointments = await this.prisma.appointment.findMany({
      where: {
        status: {
          notIn: ['COMPLETED', 'CANCELED'],
        },
      },
      select: {
        notes: true,
      },
    });

    let internacoesAtivas = 0;
    for (const apt of allAppointments) {
      try {
        if (apt.notes) {
          const parsed = typeof apt.notes === 'string' ? JSON.parse(apt.notes) : apt.notes;
          if (parsed?.type === 'HOSPITALIZATION') {
            internacoesAtivas++;
          }
        }
      } catch {
        // ignore parse errors
      }
    }

    // Calculate ticket médio
    const totalAppointmentsMonth = await this.prisma.appointment.count({
      where: {
        date: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
    });

    const faturamentoMes = (faturamentoMesData._sum.amountCents || 0) / 100;
    const faturamentoHoje = (faturamentoHojeData._sum.amountCents || 0) / 100;
    const ticketMedio = totalAppointmentsMonth > 0 ? faturamentoMes / totalAppointmentsMonth : 0;

    // Comissões pendentes: 20% do valor dos appointments pendentes
    const comissoesPendentes = ((comissoesPendentesData._sum.value || 0) * 20) / 100;

    // Count alerts (products with stock = 0)
    const alertasEstoque = await this.prisma.product.count({
      where: {
        stock: {
          lte: 0,
        },
      },
    });

    // CRM: Leads data
    let leadsNovos = 0;
    let leadsQualificados = 0;
    let taxaConversao = 0;
    try {
      leadsNovos = await this.prisma.lead.count({
        where: { createdAt: { gte: monthStart } },
      });
      leadsQualificados = await this.prisma.lead.count({
        where: { status: 'QUALIFIED', createdAt: { gte: monthStart } },
      });
      const leadsConvertidos = await this.prisma.lead.count({
        where: { status: 'CONVERTED', createdAt: { gte: monthStart } },
      });
      taxaConversao = leadsNovos > 0 ? Math.round((leadsConvertidos / leadsNovos) * 100 * 10) / 10 : 0;
    } catch {}

    // AI Agents: real stats
    let agentesAtivos = 0;
    let interacoesHoje = 0;
    let taxaSucessoAgentes = 0;
    try {
      agentesAtivos = await this.prisma.aIAgent.count({
        where: { status: 'ACTIVE' },
      });
      interacoesHoje = await this.prisma.agentExecution.count({
        where: { createdAt: { gte: todayStart } },
      });
      const totalExecucoes = await this.prisma.agentExecution.count({
        where: { createdAt: { gte: monthStart } },
      });
      const execucoesSucesso = await this.prisma.agentExecution.count({
        where: { status: 'SUCCESS', createdAt: { gte: monthStart } },
      });
      taxaSucessoAgentes = totalExecucoes > 0 ? Math.round((execucoesSucesso / totalExecucoes) * 100 * 10) / 10 : 0;
    } catch {}

    // Email open rate: placeholder (requires tracking pixel/webhook integration)
    const taxaAbertura = emailsEnviadosData > 0 ? 0 : 0;

    return {
      totalTutores,
      totalPets,
      totalClientes,
      agendamentosHoje,
      consultasHoje: agendamentosHoje,
      consultasPendentes,
      internacoesAtivas,
      faturamentoMes,
      faturamentoHoje,
      ticketMedio: Math.round(ticketMedio * 100) / 100,
      comissoesPendentes,
      // CRM
      leadsNovos,
      leadsQualificados,
      taxaConversao,
      // Campanhas
      campanhasAtivas: newslettersAtivas,
      emailsEnviados: emailsEnviadosData,
      taxaAbertura,
      // AI Agents
      agentesAtivos,
      interacoesHoje,
      taxaSucessoAgentes,
      // Estoque
      produtosBaixoEstoque,
      alertasEstoque,
    };
  }

  async getRecentActivities(userId: string, limit = 10): Promise<RecentActivity[]> {
    const activities: RecentActivity[] = [];

    // Get recent appointments
    const recentAppointments = await this.prisma.appointment.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        pet: true,
        tutor: true,
      },
    });

    for (const apt of recentAppointments) {
      activities.push({
        id: `apt-${apt.id}`,
        tipo: 'agendamento',
        titulo: 'Novo agendamento',
        descricao: `${apt.pet?.name || 'Pet'} - ${apt.description || 'Consulta'} às ${new Date(apt.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
        tempo: this.getRelativeTime(apt.createdAt),
        icone: '📅',
        cor: 'blue',
        createdAt: apt.createdAt,
      });
    }

    // Get recent finance entries (payments)
    const recentPayments = await this.prisma.financeEntry.findMany({
      where: {
        userId,
        type: 'INCOME',
        status: 'PAID',
      },
      take: 5,
      orderBy: { createdAt: 'desc' },
    });

    for (const payment of recentPayments) {
      activities.push({
        id: `pay-${payment.id}`,
        tipo: 'pagamento',
        titulo: 'Pagamento recebido',
        descricao: `${payment.counterpartyName || 'Cliente'} - R$ ${(payment.amountCents / 100).toFixed(2).replace('.', ',')}`,
        tempo: this.getRelativeTime(payment.createdAt),
        icone: '💰',
        cor: 'green',
        createdAt: payment.createdAt,
      });
    }

    // Get recent hospitalizations (appointments with type HOSPITALIZATION in notes)
    const recentHospAppointments = await this.prisma.appointment.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        pet: true,
      },
    });

    for (const apt of recentHospAppointments) {
      try {
        if (apt.notes) {
          const parsed = typeof apt.notes === 'string' ? JSON.parse(apt.notes) : apt.notes;
          if (parsed?.type === 'HOSPITALIZATION') {
            const isDischarge = apt.status === 'COMPLETED';
            activities.push({
              id: `hosp-${apt.id}`,
              tipo: 'internacao',
              titulo: isDischarge ? 'Alta de internação' : 'Nova internação',
              descricao: `${apt.pet?.name || 'Pet'} - ${isDischarge ? 'Recuperação completa' : apt.description || 'Em tratamento'}`,
              tempo: this.getRelativeTime(apt.createdAt),
              icone: '🏥',
              cor: 'teal',
              createdAt: apt.createdAt,
            });
          }
        }
      } catch {
        // ignore parse errors
      }
    }

    // Get recent newsletters
    const recentNewsletters = await this.prisma.newsletter.findMany({
      where: {
        status: 'SENT',
      },
      take: 2,
      orderBy: { sentAt: 'desc' },
      include: {
        _count: {
          select: { recipients: true },
        },
      },
    });

    for (const nl of recentNewsletters) {
      activities.push({
        id: `nl-${nl.id}`,
        tipo: 'campanha',
        titulo: 'Newsletter enviada',
        descricao: `${nl._count.recipients} destinatários`,
        tempo: this.getRelativeTime(nl.sentAt || nl.createdAt),
        icone: '📧',
        cor: 'cyan',
        createdAt: nl.sentAt || nl.createdAt,
      });
    }

    // Sort by createdAt descending and limit
    return activities.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, limit);
  }

  async getUpcomingAppointments(limit = 5): Promise<UpcomingAppointment[]> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    const appointments = await this.prisma.appointment.findMany({
      where: {
        date: {
          gte: todayStart,
          lt: todayEnd,
        },
      },
      take: limit,
      orderBy: { date: 'asc' },
      include: {
        tutor: true,
        pet: true,
      },
    });

    return appointments.map((apt: any) => {
      let status: 'confirmado' | 'pendente' | 'em_atendimento' = 'pendente';
      if (apt.status === 'CONFIRMED') status = 'confirmado';
      else if (apt.status === 'IN_PROGRESS') status = 'em_atendimento';
      else if (apt.status === 'SCHEDULED') status = 'pendente';

      return {
        id: apt.id,
        horario: new Date(apt.date).toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        tutor: apt.tutor?.name || 'Tutor não informado',
        pet: apt.pet?.name || 'Pet não informado',
        servico: apt.description || 'Consulta',
        status,
      };
    });
  }

  private getRelativeTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'agora';
    if (diffMins < 60) return `${diffMins} min`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString('pt-BR');
  }
}
