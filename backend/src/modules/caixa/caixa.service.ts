import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AppointmentsService } from '../appointments/appointments.service';

function dayRange(dateStr?: string) {
  const d = dateStr ? new Date(dateStr + 'T00:00:00') : new Date();
  const ini = new Date(d); ini.setHours(0, 0, 0, 0);
  const fim = new Date(d); fim.setHours(23, 59, 59, 999);
  return { ini, fim };
}

function rangeFromQuery(query: any) {
  const where: any = {};
  if (query?.from || query?.to) {
    where.data = {};
    if (query.from) where.data.gte = new Date(String(query.from) + 'T00:00:00');
    if (query.to) where.data.lte = new Date(String(query.to) + 'T23:59:59');
  }
  return where;
}

@Injectable()
export class CaixaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly appointmentsService: AppointmentsService,
  ) {}

  private async saldoTutor(tutorId: string) {
    const movs = await this.prisma.creditoMovimento.findMany({ where: { tutorId } });
    return movs.reduce((s: number, m: any) => s + (m.tipo === 'USO' ? -Number(m.valor) : Number(m.valor)), 0);
  }

  async findDoDia(dateStr?: string) {
    const { ini, fim } = dayRange(dateStr);
    return this.prisma.caixaSessao.findMany({
      where: { abertura: { gte: ini, lte: fim } },
      include: { user: { select: { id: true, name: true } }, recebimentos: true },
      orderBy: { abertura: 'asc' },
    });
  }

  async listRecebimentos(query: any = {}) {
    const where = rangeFromQuery(query);
    return this.prisma.recebimento.findMany({
      where,
      include: {
        appointment: { select: { id: true, value: true, pet: { select: { name: true } }, tutor: { select: { name: true } } } },
      },
      orderBy: { data: 'desc' },
      take: 500,
    });
  }

  async listMovimentos(query: any = {}) {
    const where = rangeFromQuery(query);
    return this.prisma.caixaMovimento.findMany({ where, orderBy: { data: 'desc' }, take: 500 });
  }

  async listVendas(query: any = {}) {
    const where: any = {};
    if (query?.from || query?.to) {
      where.date = {};
      if (query.from) where.date.gte = new Date(String(query.from) + 'T00:00:00');
      if (query.to) where.date.lte = new Date(String(query.to) + 'T23:59:59');
    }
    const appts = await this.prisma.appointment.findMany({
      where,
      include: {
        pet: { select: { name: true } },
        tutor: { select: { name: true } },
        recebimentos: { select: { valorTotal: true } },
      },
      orderBy: { date: 'desc' },
      take: 60,
    });
    return appts.map((a: any) => {
      const pago = (a.recebimentos || []).reduce((s: number, r: any) => s + Number(r.valorTotal), 0);
      const valor = Number(a.value || 0);
      return {
        id: a.id, tutor: a.tutor?.name || 'Cliente', pet: a.pet?.name || '',
        valor, pago, status: a.paymentStatus,
        pagoTotal: pago >= valor - 0.001 && valor > 0, date: a.date,
      };
    });
  }

  // ============================================================
  // MINHAS VENDAS / PRODUTIVIDADE (somente produtividade — sem metas).
  // A integração com o model Meta existente virá numa etapa dedicada.
  // ============================================================
  private appointmentWhere(from?: string, to?: string, userId?: string) {
    const where: any = { status: { not: 'CANCELLED' } };
    if (userId) where.userId = userId;
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(String(from) + 'T00:00:00');
      if (to) where.date.lte = new Date(String(to) + 'T23:59:59');
    }
    return where;
  }

  async produtividade(query: any, meId: string) {
    const me = await this.prisma.user.findUnique({ where: { id: meId }, select: { id: true, role: true, name: true } });
    const isAdmin = me?.role === 'ADMIN';
    const targetId = (isAdmin && query.userId) ? String(query.userId) : meId;
    const target = await this.prisma.user.findUnique({ where: { id: targetId }, select: { id: true, role: true, name: true } });
    const from = query.from, to = query.to;

    const appts = await this.prisma.appointment.findMany({
      where: this.appointmentWhere(from, to, targetId),
      include: {
        tutor: { select: { name: true } },
        pet: { select: { name: true } },
        items: { include: { servico: { select: { category: { select: { nome: true } } } } } },
      },
      orderBy: { date: 'desc' },
    });

    let total = 0;
    const grupos: Record<string, number> = {};
    for (const a of appts as any[]) {
      total += Number(a.value || 0);
      for (const it of (a.items || [])) {
        const g = it.servico?.category?.nome || 'Outros';
        grupos[g] = (grupos[g] || 0) + Number(it.valorTotal || 0);
      }
    }
    const num = appts.length;
    const ticket = num ? total / num : 0;
    const porGrupo = Object.entries(grupos).map(([grupo, valor]) => ({ grupo, valor })).sort((a, b) => b.valor - a.valor);
    const lista = (appts as any[]).slice(0, 100).map((a) => ({
      id: a.id, tutor: a.tutor?.name || '', pet: a.pet?.name || '',
      valor: Number(a.value || 0), date: a.date, status: a.paymentStatus,
    }));

    let usuarios: any[] | undefined;
    let ranking: any[] | undefined;
    if (isAdmin) {
      usuarios = await this.prisma.user.findMany({ where: { isBlocked: false }, select: { id: true, name: true, role: true }, orderBy: { name: 'asc' } });
      const byId: Record<string, any> = {};
      usuarios.forEach((u) => { byId[u.id] = u; });
      const grp = await this.prisma.appointment.groupBy({
        by: ['userId'],
        where: this.appointmentWhere(from, to),
        _sum: { value: true },
        _count: { _all: true },
      });
      ranking = [];
      for (const r of grp as any[]) {
        const u = byId[r.userId];
        if (!u) continue;
        ranking.push({ userId: u.id, name: u.name, role: u.role, total: Number(r._sum?.value || 0), num: r._count?._all || 0 });
      }
      ranking.sort((a, b) => b.total - a.total);
    }

    return {
      isAdmin,
      user: target ? { id: target.id, name: target.name, role: target.role } : null,
      total, num, ticket,
      porGrupo, lista, usuarios, ranking,
    };
  }

  async findOne(id: string) {
    const c = await this.prisma.caixaSessao.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true } },
        recebimentos: {
          orderBy: { data: 'desc' },
          include: { appointment: { select: { id: true, value: true, pet: { select: { name: true } }, tutor: { select: { name: true } } } } },
        },
        movimentos: { orderBy: { data: 'desc' } },
      },
    });
    if (!c) throw new NotFoundException('Caixa nao encontrado');
    const creditosUtilizados = await this.prisma.creditoMovimento.findMany({
      where: { caixaSessaoId: id, tipo: 'USO' },
      orderBy: { data: 'desc' },
      include: { tutor: { select: { id: true, name: true } } },
    });
    return { ...c, creditosUtilizados };
  }

  async abrir(dto: any, userId: string) {
    const count = await this.prisma.caixaSessao.count();
    return this.prisma.caixaSessao.create({
      data: {
        numero: count + 1,
        userId: dto.userId || userId,
        suprimento: Number(dto.suprimento || 0),
        observacao: dto.observacao || null,
      },
      include: { user: { select: { id: true, name: true } }, recebimentos: true },
    });
  }

  async fechar(id: string, dto: any = {}) {
    const valorEsperado = dto.valorEsperado != null ? Number(dto.valorEsperado) : null;
    const valorContado = dto.valorContado != null ? Number(dto.valorContado) : null;
    const diferenca = (valorEsperado != null && valorContado != null)
      ? Number((valorContado - valorEsperado).toFixed(2)) : null;
    return this.prisma.caixaSessao.update({
      where: { id },
      data: {
        status: 'FECHADO', fechamento: new Date(),
        valorEsperado, valorContado, diferenca,
        obsFechamento: dto.observacao || null,
      },
    });
  }

  async reabrir(id: string) {
    return this.prisma.caixaSessao.update({ where: { id }, data: { status: 'ABERTO', fechamento: null } });
  }

  async registrarRecebimento(caixaId: string, dto: any, userId: string) {
    const appointmentId = dto.appointmentId || null;
    const formas = Array.isArray(dto.formas) ? dto.formas : [];
    const creditoUsado = formas
      .filter((f: any) => /cr[eé]dito/i.test(f.forma || ''))
      .reduce((s: number, f: any) => s + Number(f.valor || 0), 0);

    let tutorId: string | null = null;
    if (appointmentId) {
      const ap = await this.prisma.appointment.findUnique({ where: { id: appointmentId }, select: { tutorId: true } });
      tutorId = ap?.tutorId || null;
    }

    if (creditoUsado > 0.001) {
      if (!tutorId) throw new BadRequestException('Venda sem cliente para debitar credito');
      const saldo = await this.saldoTutor(tutorId);
      if (saldo < creditoUsado - 0.001) throw new BadRequestException('Credito insuficiente do cliente');
    }

    const rec = await this.prisma.recebimento.create({
      data: {
        caixaSessaoId: caixaId, appointmentId,
        valorTotal: Number(dto.valorTotal || 0),
        desconto: Number(dto.desconto || 0),
        troco: Number(dto.troco || 0),
        formas: dto.formas ?? [],
        observacao: dto.observacao || null,
        createdById: userId,
      },
    });

    if (creditoUsado > 0.001 && tutorId) {
      await this.prisma.creditoMovimento.create({
        data: {
          tutorId, tipo: 'USO', valor: creditoUsado,
          descricao: 'Uso em recebimento',
          caixaSessaoId: caixaId, appointmentId, recebimentoId: rec.id, createdById: userId,
        },
      });
    }

    if (appointmentId) {
      const ap = await this.prisma.appointment.findUnique({ where: { id: appointmentId }, include: { recebimentos: true } });
      if (ap) {
        const pago = ap.recebimentos.reduce((s: number, r: any) => s + Number(r.valorTotal), 0);
        if (pago >= Number(ap.value) - 0.001) {
          await this.prisma.appointment.update({ where: { id: ap.id }, data: { paymentStatus: 'PAID' } });
        }
      }
    }
    return rec;
  }

  async registrarMovimento(caixaId: string, dto: any, userId: string) {
    const caixa = await this.prisma.caixaSessao.findUnique({ where: { id: caixaId } });
    if (!caixa) throw new NotFoundException('Caixa nao encontrado');
    return this.prisma.caixaMovimento.create({
      data: {
        caixaSessaoId: caixaId,
        tipo: String(dto.tipo || 'SANGRIA').toUpperCase(),
        valor: Number(dto.valor || 0),
        forma: dto.forma || null,
        conta: dto.conta || null,
        descricao: dto.descricao || null,
        observacao: dto.observacao || null,
        createdById: userId,
      },
    });
  }

  async vendaDireta(dto: any, userId: string) {
    if (!dto?.tutorId) throw new BadRequestException('Cliente obrigatorio');
    if (!dto?.petId) throw new BadRequestException('Pet obrigatorio');

    const itensRaw = Array.isArray(dto.itens) ? dto.itens : [];
    if (itensRaw.length === 0) throw new BadRequestException('Adicione ao menos um item');

    const items = itensRaw.map((it: any) => {
      const quantidade = Number(it.quantidade || 1);
      const valorUnitario = Number(it.valorUnitario || 0);
      const desconto = Number(it.desconto || 0);
      const valorTotal = Math.max(0, quantidade * valorUnitario - desconto);
      return { servicoId: it.servicoId ?? undefined, descricao: it.descricao ?? undefined, quantidade, valorUnitario, desconto, valorTotal };
    });
    const itensTotal = items.reduce((s: number, it: any) => s + it.valorTotal, 0);
    const descontoGlobal = Number(dto.desconto || 0);
    const valorVenda = Math.max(0, Number((itensTotal - descontoGlobal).toFixed(2)));

    const orcamento = String(dto.tipo || 'VENDA').toUpperCase() === 'ORCAMENTO';

    const appointment: any = await this.appointmentsService.create({
      tutorId: dto.tutorId, petId: dto.petId,
      userId: dto.userId || userId,
      date: dto.date || new Date().toISOString(),
      value: valorVenda, items,
    } as any);

    const formas = orcamento ? [] : (Array.isArray(dto.formas) ? dto.formas : []);
    const somaFormas = formas.reduce((s: number, f: any) => s + Number(f.valor || 0), 0);
    const temDinheiro = formas.some((f: any) => /dinheiro/i.test(f.forma || ''));
    const troco = temDinheiro && somaFormas > valorVenda ? Number((somaFormas - valorVenda).toFixed(2)) : 0;
    const valorAplicado = Math.max(0, Number((somaFormas - troco).toFixed(2)));

    let recebimento: any = null;
    if (somaFormas > 0.001) {
      let caixaId = dto.caixaId || null;
      if (!caixaId) {
        const aberto = await this.prisma.caixaSessao.findFirst({ where: { status: 'ABERTO' }, orderBy: { abertura: 'desc' } });
        if (!aberto) throw new BadRequestException('Nenhum caixa aberto. Abra o caixa antes de receber.');
        caixaId = aberto.id;
      }
      recebimento = await this.registrarRecebimento(caixaId, {
        appointmentId: appointment.id, valorTotal: valorAplicado,
        desconto: descontoGlobal, troco, formas,
        observacao: dto.observacao || 'Venda PDV',
      }, userId);
    }

    return { ok: true, orcamento, appointment, recebimento, valorVenda, valorAplicado, troco };
  }

  async deleteMovimento(caixaId: string, itemId: string) {
    const mov = await this.prisma.caixaMovimento.findUnique({ where: { id: itemId } });
    if (!mov || mov.caixaSessaoId !== caixaId) throw new NotFoundException('Movimento nao encontrado');
    await this.prisma.caixaMovimento.delete({ where: { id: itemId } });
    return { ok: true };
  }

  async deleteRecebimento(caixaId: string, itemId: string) {
    const rec = await this.prisma.recebimento.findUnique({ where: { id: itemId } });
    if (!rec || rec.caixaSessaoId !== caixaId) throw new NotFoundException('Recebimento nao encontrado');
    await this.prisma.creditoMovimento.deleteMany({ where: { recebimentoId: itemId } });
    await this.prisma.recebimento.delete({ where: { id: itemId } });
    if (rec.appointmentId) {
      const ap = await this.prisma.appointment.findUnique({ where: { id: rec.appointmentId }, include: { recebimentos: true } });
      if (ap) {
        const pago = ap.recebimentos.reduce((s: number, r: any) => s + Number(r.valorTotal), 0);
        await this.prisma.appointment.update({ where: { id: ap.id }, data: { paymentStatus: pago >= Number(ap.value) - 0.001 ? 'PAID' : 'PENDING' } });
      }
    }
    return { ok: true };
  }

  async deleteCredito(caixaId: string, itemId: string) {
    const c = await this.prisma.creditoMovimento.findUnique({ where: { id: itemId } });
    if (!c || c.caixaSessaoId !== caixaId) throw new NotFoundException('Credito nao encontrado');
    await this.prisma.creditoMovimento.delete({ where: { id: itemId } });
    return { ok: true };
  }
}
