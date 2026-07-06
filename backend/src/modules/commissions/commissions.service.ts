import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommissionDto } from './dto/create-commission.dto';
import { UpdateCommissionDto } from './dto/update-commission.dto';

type CommissionStatus = 'PENDING' | 'PAID' | 'CANCELLED';
type CommissionType = 'CONSULTATION' | 'SURGERY' | 'HOSPITALIZATION' | 'SERVICE' | 'PRODUCT';

@Injectable()
export class CommissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(params?: {
    page?: number;
    limit?: number;
    status?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const { page = 1, limit = 100, status, userId, startDate, endDate } = params || {};
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) {
      where.paymentStatus =
        status === 'PAID' ? 'PAID' : status === 'PENDING' ? 'PENDING' : undefined;
    }
    if (userId) where.userId = userId;
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    const [appointments, total] = await Promise.all([
      this.prisma.appointment.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true, role: true } },
          tutor: { select: { id: true, name: true } },
          pet: { select: { id: true, name: true } },
          treatments: { include: { product: true } },
        },
        orderBy: { date: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.appointment.count({ where }),
    ]);

    const commissions = appointments.map((appointment: any) => {
      let serviceType: CommissionType = 'CONSULTATION';
      let serviceName = appointment.description || 'Consulta';

      try {
        if (appointment.notes) {
          const parsed =
            typeof appointment.notes === 'string'
              ? JSON.parse(appointment.notes)
              : (appointment.notes as any);
          if (parsed.type === 'HOSPITALIZATION') {
            serviceType = 'HOSPITALIZATION';
            serviceName = parsed.details?.reason || 'Internação';
          } else if (parsed.type === 'SURGERY') {
            serviceType = 'SURGERY';
            serviceName = parsed.details?.procedure || 'Cirurgia';
          }
        }
      } catch {
        // ignore
      }

      const commissionRates: Record<CommissionType, number> = {
        CONSULTATION: 30,
        SURGERY: 25,
        HOSPITALIZATION: 15,
        SERVICE: 20,
        PRODUCT: 10,
      };

      const commissionRate = commissionRates[serviceType] || 20;
      const commissionValue = (appointment.value * commissionRate) / 100;

      return {
        id: appointment.id,
        appointmentId: appointment.id,
        professional: {
          id: appointment.user.id,
          name: appointment.user.name || appointment.user.email,
          role: appointment.user.role,
          avatar: null,
        },
        service: serviceName,
        serviceType,
        clientName: appointment.tutor.name,
        petName: appointment.pet.name,
        totalValue: appointment.value,
        commissionRate,
        commissionValue,
        status:
          appointment.paymentStatus === 'PAID'
            ? ('PAID' as CommissionStatus)
            : appointment.paymentStatus === 'CANCELLED'
              ? ('CANCELLED' as CommissionStatus)
              : ('PENDING' as CommissionStatus),
        serviceDate: appointment.date.toISOString(),
        paymentDate:
          appointment.paymentStatus === 'PAID' ? appointment.updatedAt.toISOString() : undefined,
        createdAt: appointment.createdAt.toISOString(),
      };
    });

    return {
      commissions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getById(id: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        tutor: { select: { id: true, name: true } },
        pet: { select: { id: true, name: true } },
        treatments: { include: { product: true } },
      },
    });

    if (!appointment) throw new NotFoundException('Comissão não encontrada');

    let serviceType: CommissionType = 'CONSULTATION';
    let serviceName = appointment.description || 'Consulta';
    try {
      if (appointment.notes) {
        const parsed =
          typeof appointment.notes === 'string'
            ? JSON.parse(appointment.notes)
            : (appointment.notes as any);
        if (parsed.type === 'HOSPITALIZATION') {
          serviceType = 'HOSPITALIZATION';
          serviceName = parsed.details?.reason || 'Internação';
        } else if (parsed.type === 'SURGERY') {
          serviceType = 'SURGERY';
          serviceName = parsed.details?.procedure || 'Cirurgia';
        }
      }
    } catch {
      // ignore
    }

    const commissionRates: Record<CommissionType, number> = {
      CONSULTATION: 30,
      SURGERY: 25,
      HOSPITALIZATION: 15,
      SERVICE: 20,
      PRODUCT: 10,
    };
    const commissionRate = commissionRates[serviceType] || 20;
    const commissionValue = (appointment.value * commissionRate) / 100;

    return {
      id: appointment.id,
      appointmentId: appointment.id,
      professional: {
        id: appointment.user.id,
        name: appointment.user.name || appointment.user.email,
        role: appointment.user.role,
        avatar: null,
      },
      service: serviceName,
      serviceType,
      clientName: appointment.tutor.name,
      petName: appointment.pet.name,
      totalValue: appointment.value,
      commissionRate,
      commissionValue,
      status:
        appointment.paymentStatus === 'PAID'
          ? ('PAID' as CommissionStatus)
          : appointment.paymentStatus === 'CANCELLED'
            ? ('CANCELLED' as CommissionStatus)
            : ('PENDING' as CommissionStatus),
      serviceDate: appointment.date.toISOString(),
      paymentDate:
        appointment.paymentStatus === 'PAID' ? appointment.updatedAt.toISOString() : undefined,
      createdAt: appointment.createdAt.toISOString(),
    };
  }

  async create(dto: CreateCommissionDto) {
    if (!dto.appointmentId) {
      throw new BadRequestException(
        'Criação de comissão sem agendamento não implementada. Use appointmentId.',
      );
    }

    const appointment = await this.prisma.appointment.findUnique({
      where: { id: dto.appointmentId },
    });
    if (!appointment) throw new NotFoundException('Agendamento não encontrado');

    const paymentStatus =
      dto.status === 'PAID' ? 'PAID' : dto.status === 'CANCELLED' ? 'CANCELLED' : 'PENDING';

    await this.prisma.appointment.update({
      where: { id: dto.appointmentId },
      data: { paymentStatus, value: dto.totalValue },
    });

    const updated = await this.prisma.appointment.findUnique({
      where: { id: dto.appointmentId },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        tutor: { select: { id: true, name: true } },
        pet: { select: { id: true, name: true } },
      },
    });
    if (!updated) throw new BadRequestException('Erro ao buscar agendamento atualizado');

    const commissionValue = (dto.totalValue * dto.commissionRate) / 100;

    return {
      id: updated.id,
      appointmentId: updated.id,
      professional: {
        id: updated.user.id,
        name: updated.user.name || updated.user.email,
        role: updated.user.role,
        avatar: null,
      },
      service: dto.serviceName,
      serviceType: dto.serviceType,
      clientName: updated.tutor.name,
      petName: updated.pet.name,
      totalValue: dto.totalValue,
      commissionRate: dto.commissionRate,
      commissionValue,
      status: paymentStatus as CommissionStatus,
      serviceDate: updated.date.toISOString(),
      paymentDate: paymentStatus === 'PAID' ? new Date().toISOString() : undefined,
      createdAt: updated.createdAt.toISOString(),
    };
  }

  async update(id: string, dto: UpdateCommissionDto) {
    const appointment = await this.prisma.appointment.findUnique({ where: { id } });
    if (!appointment) throw new NotFoundException('Comissão não encontrada');

    const updateData: any = {};
    if (dto.status) {
      updateData.paymentStatus =
        dto.status === 'PAID' ? 'PAID' : dto.status === 'CANCELLED' ? 'CANCELLED' : 'PENDING';
    }
    if (dto.totalValue !== undefined) updateData.value = dto.totalValue;

    const updated = await this.prisma.appointment.update({
      where: { id },
      data: updateData,
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        tutor: { select: { id: true, name: true } },
        pet: { select: { id: true, name: true } },
      },
    });

    // recalcula comissão (mesma lógica de GET)
    let serviceType: CommissionType = 'CONSULTATION';
    let serviceName = updated.description || 'Consulta';
    try {
      if (updated.notes) {
        const parsed =
          typeof updated.notes === 'string' ? JSON.parse(updated.notes) : (updated.notes as any);
        if (parsed.type === 'HOSPITALIZATION') {
          serviceType = 'HOSPITALIZATION';
          serviceName = parsed.details?.reason || 'Internação';
        } else if (parsed.type === 'SURGERY') {
          serviceType = 'SURGERY';
          serviceName = parsed.details?.procedure || 'Cirurgia';
        }
      }
    } catch {
      // ignore
    }

    const commissionRates: Record<CommissionType, number> = {
      CONSULTATION: 30,
      SURGERY: 25,
      HOSPITALIZATION: 15,
      SERVICE: 20,
      PRODUCT: 10,
    };
    const commissionRate = commissionRates[serviceType] || 20;
    const commissionValue = (updated.value * commissionRate) / 100;

    return {
      id: updated.id,
      appointmentId: updated.id,
      professional: {
        id: updated.user.id,
        name: updated.user.name || updated.user.email,
        role: updated.user.role,
        avatar: null,
      },
      service: serviceName,
      serviceType,
      clientName: updated.tutor.name,
      petName: updated.pet.name,
      totalValue: updated.value,
      commissionRate,
      commissionValue,
      status:
        updated.paymentStatus === 'PAID'
          ? ('PAID' as CommissionStatus)
          : updated.paymentStatus === 'CANCELLED'
            ? ('CANCELLED' as CommissionStatus)
            : ('PENDING' as CommissionStatus),
      serviceDate: updated.date.toISOString(),
      paymentDate: updated.paymentStatus === 'PAID' ? updated.updatedAt.toISOString() : undefined,
      createdAt: updated.createdAt.toISOString(),
    };
  }

  async remove(id: string) {
    const appointment = await this.prisma.appointment.findUnique({ where: { id } });
    if (!appointment) throw new NotFoundException('Comissão não encontrada');

    await this.prisma.appointment.update({
      where: { id },
      data: { paymentStatus: 'CANCELLED', status: 'CANCELED' },
    });

    return { message: 'Comissão cancelada com sucesso' };
  }

  // =====================================================================
  // COMISSIONAMENTO COMPLETO (config, aberto, fechamento, extratos, minhas)
  // =====================================================================

  private readonly defaultConfig = {
    base: 'MARGEM',
    considerar: 'BAIXADAS',
    abaterTaxaCartao: false,
    lancarContasPagar: true,
    funcionarioVePropria: true,
    comissionados: [] as string[],
  };

  async getConfig() {
    const row = await this.prisma.listaItem.findFirst({
      where: { lista: 'comissaoconfig' },
    });
    if (!row) return { ...this.defaultConfig };
    try {
      return { ...this.defaultConfig, ...JSON.parse(row.valor) };
    } catch {
      return { ...this.defaultConfig };
    }
  }

  async saveConfig(config: any) {
    const merged = { ...this.defaultConfig, ...(config || {}) };
    const valor = JSON.stringify(merged);
    const existing = await this.prisma.listaItem.findFirst({
      where: { lista: 'comissaoconfig' },
    });
    if (existing) {
      await this.prisma.listaItem.update({
        where: { id: existing.id },
        data: { valor },
      });
    } else {
      await this.prisma.listaItem.create({
        data: { lista: 'comissaoconfig', valor, ordem: 0, ativo: true },
      });
    }
    return this.getConfig();
  }

  private iniciais(nome?: string | null): string {
    const n = (nome || '').trim();
    if (!n) return '--';
    return n.slice(0, 2).toUpperCase();
  }

  private pctMedio(base: number, comissao: number): number {
    if (!base || base <= 0) return 0;
    return Number(((comissao / base) * 100).toFixed(2));
  }

  /**
   * Computa as linhas "em aberto" (item a item) até baixadasAte.
   * Retorna cada AppointmentItem já com base/comissao calculadas.
   */
  private async computeRows(
    baixadasAte: Date,
    config: any,
    filterUserId?: string,
  ) {
    const where: any = {
      comissaoExtratoId: null,
      executorUserId: { not: null },
      appointment: { date: { lte: baixadasAte } },
    };
    if (config.considerar === 'BAIXADAS') {
      where.appointment.paymentStatus = 'PAID';
    }
    const comissionados: string[] = Array.isArray(config.comissionados)
      ? config.comissionados
      : [];
    if (filterUserId) {
      where.executorUserId = filterUserId;
    } else if (comissionados.length > 0) {
      where.executorUserId = { in: comissionados };
    }

    const items = await this.prisma.appointmentItem.findMany({
      where,
      include: {
        appointment: {
          select: { paymentStatus: true, date: true, tutorId: true, petId: true },
        },
        product: { select: { name: true, custoPadrao: true } },
        servico: { select: { nome: true } },
      },
    });

    // Pré-carrega % de comissão dos profissionais por userId
    const profissionais = await this.prisma.profissional.findMany({
      where: { userId: { not: null } },
      select: { userId: true, comissaoPercentual: true },
    });
    const pctMap: Record<string, number> = {};
    for (const p of profissionais) {
      if (p.userId) pctMap[p.userId] = p.comissaoPercentual ?? 0;
    }

    const rows = items.map((item: any) => {
      const userId: string = item.executorUserId;
      const qtd = item.quantidade ?? 1;
      const base =
        config.base === 'MARGEM'
          ? Math.max(0, (item.valorTotal ?? 0) - (item.custoUnitario ?? 0) * qtd)
          : item.valorTotal ?? 0;
      const pct =
        item.comissaoTipo === 'PERCENTUAL' && item.comissaoValor != null
          ? item.comissaoValor
          : pctMap[userId] ?? 0;
      const comissao =
        item.comissaoTipo === 'VALOR_FIXO' && item.comissaoValor != null
          ? item.comissaoValor * qtd
          : (base * pct) / 100;
      // TODO: abaterTaxaCartao — quando ativo, descontar taxa de cartão do valor
      // antes de calcular a base. Não implementado nesta fase.
      const nome =
        item.product?.name || item.servico?.nome || item.descricao || '—';
      const data = item.appointment?.date
        ? new Date(item.appointment.date).toISOString().slice(0, 10)
        : '';
      return {
        itemId: item.id as string,
        userId,
        grupo: item.grupo || 'Outros',
        nome,
        data,
        base,
        comissao,
      };
    });

    return rows;
  }

  async aberto(baixadasAteStr?: string) {
    const config = await this.getConfig();
    const baixadasAte = baixadasAteStr ? new Date(baixadasAteStr) : new Date();
    const rows = await this.computeRows(baixadasAte, config);

    // Info dos usuários envolvidos
    const userIds = [...new Set(rows.map((r) => r.userId))];
    const users = userIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true, role: true },
        })
      : [];
    const userMap: Record<string, { name: string | null; role: any }> = {};
    for (const u of users) userMap[u.id] = { name: u.name, role: u.role };

    const grouped: Record<
      string,
      { userId: string; itens: number; base: number; comissao: number }
    > = {};
    for (const r of rows) {
      const g =
        grouped[r.userId] ||
        (grouped[r.userId] = {
          userId: r.userId,
          itens: 0,
          base: 0,
          comissao: 0,
        });
      g.itens += 1;
      g.base += r.base;
      g.comissao += r.comissao;
    }

    const resumo = Object.values(grouped)
      .map((g) => ({
        userId: g.userId,
        nome: userMap[g.userId]?.name || '—',
        iniciais: this.iniciais(userMap[g.userId]?.name),
        role: userMap[g.userId]?.role ?? null,
        itens: g.itens,
        base: Number(g.base.toFixed(2)),
        comissao: Number(g.comissao.toFixed(2)),
        pctMedio: this.pctMedio(g.base, g.comissao),
      }))
      .sort((a, b) => b.comissao - a.comissao);

    const totais = resumo.reduce(
      (acc, r) => {
        acc.itens += r.itens;
        acc.base += r.base;
        acc.comissao += r.comissao;
        return acc;
      },
      { itens: 0, base: 0, comissao: 0 },
    );
    totais.base = Number(totais.base.toFixed(2));
    totais.comissao = Number(totais.comissao.toFixed(2));

    return {
      config,
      baixadasAte: baixadasAte.toISOString(),
      resumo,
      totais,
    };
  }

  async fechar(dto: { baixadasAte?: string; referencia?: string }, createdById?: string) {
    const config = await this.getConfig();
    const baixadasAte = dto.baixadasAte ? new Date(dto.baixadasAte) : new Date();
    const rows = await this.computeRows(baixadasAte, config);

    if (rows.length === 0) {
      throw new BadRequestException('Nada a fechar no período');
    }

    // Info dos usuários envolvidos
    const userIds = [...new Set(rows.map((r) => r.userId))];
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, role: true },
    });
    const userMap: Record<string, { name: string | null; role: any }> = {};
    for (const u of users) userMap[u.id] = { name: u.name, role: u.role };

    // Agrupa por usuário
    const grouped: Record<
      string,
      {
        userId: string;
        itens: number;
        base: number;
        comissao: number;
        itemIds: string[];
        linhas: any[];
      }
    > = {};
    for (const r of rows) {
      const g =
        grouped[r.userId] ||
        (grouped[r.userId] = {
          userId: r.userId,
          itens: 0,
          base: 0,
          comissao: 0,
          itemIds: [],
          linhas: [],
        });
      g.itens += 1;
      g.base += r.base;
      g.comissao += r.comissao;
      g.itemIds.push(r.itemId);
      g.linhas.push({
        itemId: r.itemId,
        nome: r.nome,
        grupo: r.grupo,
        data: r.data,
        base: Number(r.base.toFixed(2)),
        comissao: Number(r.comissao.toFixed(2)),
      });
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const fechamento = await tx.comissaoFechamento.create({
        data: {
          baixadasAte,
          referencia: dto.referencia ?? null,
          base: config.base,
          configSnapshot: config,
          createdById: createdById ?? null,
        },
      });

      for (const g of Object.values(grouped)) {
        const extrato = await tx.comissaoExtrato.create({
          data: {
            fechamentoId: fechamento.id,
            userId: g.userId,
            itens: g.itens,
            base: Number(g.base.toFixed(2)),
            comissao: Number(g.comissao.toFixed(2)),
            status: 'A_PAGAR',
            linhas: {
              userId: g.userId,
              nome: userMap[g.userId]?.name || '—',
              iniciais: this.iniciais(userMap[g.userId]?.name),
              itens: g.itens,
              base: Number(g.base.toFixed(2)),
              comissao: Number(g.comissao.toFixed(2)),
              pctMedio: this.pctMedio(g.base, g.comissao),
              linhas: g.linhas,
            },
          },
        });
        await tx.appointmentItem.updateMany({
          where: { id: { in: g.itemIds } },
          data: { comissaoExtratoId: extrato.id },
        });
      }

      // TODO: lancarContasPagar — quando ativo, lançar cada extrato como conta
      // a pagar no módulo financeiro. Não implementado nesta fase.

      return tx.comissaoFechamento.findUnique({
        where: { id: fechamento.id },
        include: { extratos: { include: { user: { select: { id: true, name: true } } } } },
      });
    });

    return result;
  }

  async extratos(params: {
    from?: string;
    to?: string;
    userId?: string;
    status?: string;
  }) {
    const { from, to, userId, status } = params || {};
    const where: any = {};
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }
    // Filtro nos extratos (userId/status)
    const extratoFilter: any = {};
    if (userId) extratoFilter.userId = userId;
    if (status) extratoFilter.status = status;
    if (Object.keys(extratoFilter).length > 0) {
      where.extratos = { some: extratoFilter };
    }

    const fechamentos = await this.prisma.comissaoFechamento.findMany({
      where,
      include: {
        extratos: {
          include: { user: { select: { id: true, name: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return fechamentos.map((f: any) => {
      // Aplica os mesmos filtros dentro dos extratos exibidos
      const exts = f.extratos.filter((e: any) => {
        if (userId && e.userId !== userId) return false;
        if (status && e.status !== status) return false;
        return true;
      });
      return {
        fechamentoId: f.id,
        createdAt: f.createdAt,
        referencia: f.referencia,
        baixadasAte: f.baixadasAte,
        total: Number(
          exts.reduce((s: number, e: any) => s + (e.comissao ?? 0), 0).toFixed(2),
        ),
        extratos: exts.map((e: any) => ({
          id: e.id,
          userId: e.userId,
          nome: e.user?.name || '—',
          iniciais: this.iniciais(e.user?.name),
          itens: e.itens,
          comissao: e.comissao,
          status: e.status,
          pagoAt: e.pagoAt,
        })),
      };
    });
  }

  async updateExtratoStatus(id: string, status: string) {
    const extrato = await this.prisma.comissaoExtrato.findUnique({ where: { id } });
    if (!extrato) throw new NotFoundException('Extrato não encontrado');

    const updated = await this.prisma.comissaoExtrato.update({
      where: { id },
      data: {
        status,
        pagoAt: status === 'PAGO' ? new Date() : null,
      },
    });
    return updated;
  }

  async minhas(userId: string, baixadasAteStr?: string) {
    const config = await this.getConfig();
    const baixadasAte = baixadasAteStr ? new Date(baixadasAteStr) : new Date();
    const rows = await this.computeRows(baixadasAte, config, userId);

    const resumo = rows.reduce(
      (acc, r) => {
        acc.itens += 1;
        acc.base += r.base;
        acc.comissao += r.comissao;
        return acc;
      },
      { itens: 0, base: 0, comissao: 0, pctMedio: 0 },
    );
    resumo.base = Number(resumo.base.toFixed(2));
    resumo.comissao = Number(resumo.comissao.toFixed(2));
    resumo.pctMedio = this.pctMedio(
      rows.reduce((s, r) => s + r.base, 0),
      rows.reduce((s, r) => s + r.comissao, 0),
    );

    const aggregate = (keyFn: (r: (typeof rows)[number]) => string) => {
      const map: Record<
        string,
        { key: string; itens: number; base: number; comissao: number }
      > = {};
      for (const r of rows) {
        const k = keyFn(r);
        const g = map[k] || (map[k] = { key: k, itens: 0, base: 0, comissao: 0 });
        g.itens += 1;
        g.base += r.base;
        g.comissao += r.comissao;
      }
      return Object.values(map).map((g) => ({
        key: g.key,
        itens: g.itens,
        base: Number(g.base.toFixed(2)),
        comissao: Number(g.comissao.toFixed(2)),
        pctMedio: this.pctMedio(g.base, g.comissao),
      }));
    };

    const porGrupo = aggregate((r) => r.grupo)
      .map(({ key, ...rest }) => ({ grupo: key, ...rest }))
      .sort((a, b) => b.comissao - a.comissao);
    const porProduto = aggregate((r) => r.nome)
      .map(({ key, ...rest }) => ({ nome: key, ...rest }))
      .sort((a, b) => b.comissao - a.comissao);
    const porData = aggregate((r) => r.data)
      .map(({ key, ...rest }) => ({ data: key, ...rest }))
      .sort((a, b) => (a.data < b.data ? 1 : -1));

    return { resumo, porGrupo, porProduto, porData };
  }
}
