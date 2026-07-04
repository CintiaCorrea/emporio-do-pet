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
    const abertas = ['1', 'true', true].includes(query?.abertas);
    const where: any = {};
    if (query?.from || query?.to) {
      where.date = {};
      if (query.from) where.date.gte = new Date(String(query.from) + 'T00:00:00');
      if (query.to) where.date.lte = new Date(String(query.to) + 'T23:59:59');
    }
    if (abertas) {
      where.paymentStatus = { not: 'PAID' };
      where.value = { gt: 0 };
    }
    const appts = await this.prisma.appointment.findMany({
      where,
      include: {
        pet: { select: { name: true, species: true } },
        tutor: { select: { id: true, name: true } },
        user: { select: { id: true, name: true } },
        recebimentos: { select: { valorTotal: true } },
      },
      orderBy: { date: 'desc' },
      take: abertas ? 300 : 60,
    });
    let rows = appts.map((a: any) => {
      const pago = (a.recebimentos || []).reduce((s: number, r: any) => s + Number(r.valorTotal), 0);
      const valor = Number(a.value || 0);
      const isInternacao = typeof a.notes === 'string' && a.notes.includes('HOSPITALIZATION');
      const origem = isInternacao
        ? 'INTERNACAO'
        : (a.chiefComplaint || a.diagnosis || a.anamnesis ? 'ATENDIMENTO' : 'VENDA');
      return {
        id: a.id, tutorId: a.tutor?.id || null, tutor: a.tutor?.name || 'Cliente',
        pet: a.pet?.name || '', petSpecies: a.pet?.species || null,
        vet: a.user?.name || null,
        valor, pago, aberto: Math.max(0, valor - pago), status: a.paymentStatus,
        pagoTotal: pago >= valor - 0.001 && valor > 0, date: a.date, origem,
      };
    });
    // "Comandas abertas": só o que ainda tem saldo e NÃO é internação (essa é faturada pela conta da F5)
    if (abertas) rows = rows.filter((r) => !r.pagoTotal && r.origem !== 'INTERNACAO');
    return rows;
  }

  // Ranking ABC de clientes (Fase 3 relatórios): gasto por cliente em 365/90/30 dias + classe A/B/C pela % acumulada.
  async rankingClientes() {
    const now = Date.now();
    const d365 = new Date(now - 365 * 86400000);
    const d90 = new Date(now - 90 * 86400000);
    const d30 = new Date(now - 30 * 86400000);
    const appts = await this.prisma.appointment.findMany({
      where: { value: { gt: 0 }, date: { gte: d365 }, status: { not: 'CANCELLED' } },
      select: { tutorId: true, value: true, date: true, tutor: { select: { name: true } }, pet: { select: { name: true, species: true } } },
    });
    const map = new Map<string, any>();
    for (const a of appts) {
      if (!a.tutorId) continue;
      if (!map.has(a.tutorId)) map.set(a.tutorId, { tutorId: a.tutorId, nome: a.tutor?.name || 'Cliente', petsSet: new Set<string>(), total365: 0, total90: 0, total30: 0 });
      const g = map.get(a.tutorId); const v = Number(a.value) || 0;
      g.total365 += v;
      if (a.date >= d90) g.total90 += v;
      if (a.date >= d30) g.total30 += v;
      if (a.pet?.name) g.petsSet.add(JSON.stringify({ n: a.pet.name, s: a.pet.species || null }));
    }
    let list = [...map.values()].map((g) => ({ tutorId: g.tutorId, nome: g.nome, pets: [...g.petsSet].map((x: string) => JSON.parse(x)), total365: g.total365, total90: g.total90, total30: g.total30 }));
    list.sort((a, b) => b.total365 - a.total365);
    const totalRev = list.reduce((s, g) => s + g.total365, 0) || 1;
    let cum = 0;
    const clientes = list.map((g, i) => { cum += g.total365; const pctCum = cum / totalRev; const classe = pctCum <= 0.65 ? 'A' : pctCum <= 0.90 ? 'B' : 'C'; return { ...g, posicao: i + 1, classe }; });
    const agg: any = { A: { count: 0, rev: 0 }, B: { count: 0, rev: 0 }, C: { count: 0, rev: 0 } };
    for (const g of clientes) { agg[g.classe].count++; agg[g.classe].rev += g.total365; }
    const resumo = {
      A: { count: agg.A.count, pct: Math.round((agg.A.rev / totalRev) * 100) },
      B: { count: agg.B.count, pct: Math.round((agg.B.rev / totalRev) * 100) },
      C: { count: agg.C.count, pct: Math.round((agg.C.rev / totalRev) * 100) },
    };
    return { clientes, resumo };
  }

  // Recebimentos analítico (Fase 3): KPIs + quebras por forma/usuário/dia/marca no período.
  async recebimentosResumo(query: any = {}) {
    const where = rangeFromQuery(query);
    if (!where.data) { const { ini, fim } = dayRange(); where.data = { gte: ini, lte: fim }; }
    const recs = await this.prisma.recebimento.findMany({
      where,
      include: { appointment: { select: { date: true, items: { select: { marca: true, valorTotal: true } } } } },
    });
    const userIds = [...new Set(recs.map((r) => r.createdById).filter(Boolean))] as string[];
    const users = userIds.length ? await this.prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } }) : [];
    const userName = new Map(users.map((u) => [u.id, u.name]));
    const MARCAS: Record<string, string> = { EMPORIO: "🏥 Empório", MUNDO_A_PARTE: "🌿 Mundo à Parte", DRA_VIVIAN: "✨ Dra. Vivian" };
    const sameDay = (a: any, b: any) => a && b && new Date(a).toDateString() === new Date(b).toDateString();
    let receitaTotal = 0, noDia = 0, posteriores = 0;
    const porForma = new Map<string, number>(), porUsuario = new Map<string, number>(), porDia = new Map<string, number>(), porMarca = new Map<string, number>();
    for (const r of recs) {
      const v = Number(r.valorTotal) || 0;
      receitaTotal += v;
      if (sameDay(r.data, r.appointment?.date)) noDia += v; else posteriores += v;
      const formas: any[] = Array.isArray(r.formas) ? (r.formas as any[]) : [];
      for (const f of formas) { const nm = f?.forma || "Outro"; porForma.set(nm, (porForma.get(nm) || 0) + (Number(f?.valor) || 0)); }
      const un = (r.createdById && userName.get(r.createdById)) || "Sistema";
      porUsuario.set(un, (porUsuario.get(un) || 0) + v);
      const dia = new Date(r.data).toISOString().slice(0, 10);
      porDia.set(dia, (porDia.get(dia) || 0) + v);
      const itens: any[] = (r.appointment as any)?.items || [];
      const somaItens = itens.reduce((s, i) => s + (Number(i.valorTotal) || 0), 0);
      if (somaItens > 0) { for (const it of itens) { const m = MARCAS[it.marca] || it.marca || "Sem marca"; porMarca.set(m, (porMarca.get(m) || 0) + v * (Number(it.valorTotal) || 0) / somaItens); } }
      else { porMarca.set("Sem marca", (porMarca.get("Sem marca") || 0) + v); }
    }
    const cred = await this.prisma.creditoMovimento.findMany({ where: { tipo: "RECARGA", ...(where.data ? { data: where.data } : {}) } });
    const adiantamento = cred.reduce((s, c) => s + Number(c.valor), 0);
    const apWhere: any = { value: { gt: 0 } };
    if (where.data) apWhere.date = where.data;
    const aps = await this.prisma.appointment.findMany({ where: apWhere, select: { value: true, recebimentos: { select: { valorTotal: true } } } });
    const emAberto = aps.reduce((s, a) => { const pago = (a.recebimentos || []).reduce((x, r) => x + Number(r.valorTotal), 0); return s + Math.max(0, Number(a.value) - pago); }, 0);
    const toArr = (m: Map<string, number>) => [...m.entries()].map(([nome, valor]) => ({ nome, valor })).sort((a, b) => b.valor - a.valor);
    return {
      kpis: { noDia, posteriores, adiantamento, receitaTotal, emAberto },
      porForma: toArr(porForma), porUsuario: toArr(porUsuario),
      porDia: toArr(porDia).sort((a, b) => a.nome.localeCompare(b.nome)), porMarca: toArr(porMarca),
    };
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
        // baixa estoque só na TRANSIÇÃO para PAID (evita baixar 2x se registrar outro recebimento)
        if (pago >= Number(ap.value) - 0.001 && ap.paymentStatus !== 'PAID') {
          await this.prisma.appointment.update({ where: { id: ap.id }, data: { paymentStatus: 'PAID' } });
          await this.baixarEstoqueDaVenda(ap.id);
        }
      }
    }
    return rec;
  }

  // Fase 5 — quando a venda é paga, desconta o estoque dos itens que são PRODUTO estocável (serviço não baixa).
  private async baixarEstoqueDaVenda(appointmentId: string) {
    try {
      const itens = await this.prisma.appointmentItem.findMany({
        where: { appointmentId, productId: { not: null } },
        select: { productId: true, quantidade: true },
      });
      for (const it of itens) {
        if (!it.productId) continue;
        const prod = await this.prisma.product.findUnique({ where: { id: it.productId }, select: { type: true } });
        if (!prod || prod.type === 'SERVICE') continue; // serviço não movimenta estoque
        const qtd = Math.max(1, Math.round(Number(it.quantidade) || 1));
        await this.prisma.product.update({ where: { id: it.productId }, data: { stock: { decrement: qtd } } });
      }
    } catch (e: any) {
      // não pode quebrar o recebimento (a venda já foi registrada)
      console.error('baixarEstoqueDaVenda erro:', e?.message);
    }
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
      return { servicoId: it.servicoId ?? undefined, productId: it.productId ?? undefined, descricao: it.descricao ?? undefined, quantidade, valorUnitario, desconto, valorTotal };
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
