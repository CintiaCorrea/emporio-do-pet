import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AppointmentsService } from '../appointments/appointments.service';
import { ensureNumeroVenda } from '../../common/venda-numero';

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
  private ultimoPersistNivel = 0; // throttle do persist de nível (fire-and-forget)
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
    const rows = await this.prisma.recebimento.findMany({
      where,
      include: {
        appointment: { select: { id: true, value: true, numeroVenda: true, codigoExterno: true, pet: { select: { name: true } }, tutor: { select: { id: true, name: true } }, items: { select: { marca: true } } } },
      },
      orderBy: { data: 'desc' },
      take: 500,
    });
    // enriquecimento aditivo p/ filtros da tela: quem deu a baixa (usuario) + marcas presentes na venda
    const userIds = [...new Set(rows.map((r) => r.createdById).filter(Boolean))] as string[];
    const users = userIds.length ? await this.prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } }) : [];
    const userName = new Map(users.map((u) => [u.id, u.name]));
    const MARCAS: Record<string, string> = { EMPORIO: '🏥 Empório', MUNDO_A_PARTE: '🌿 Mundo à Parte', DRA_VIVIAN: '✨ Dra. Vivian' };
    return rows.map((r: any) => ({
      ...r,
      usuario: (r.createdById && userName.get(r.createdById)) || 'Sistema',
      marcas: [...new Set(((r.appointment?.items || []) as any[]).map((i) => MARCAS[i.marca] || i.marca).filter(Boolean))],
    }));
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
        id: a.id, numeroVenda: a.numeroVenda ?? null, codigoExterno: a.codigoExterno ?? null,
        tutorId: a.tutor?.id || null, tutor: a.tutor?.name || 'Cliente',
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

  // Retenção e churn — recorte CLÍNICO vs FISIOTERAPIA por recência (dias desde a última visita).
  // Sem mudar schema: usa a mesma heurística isFisio (type/descrição) já usada na confirmação de agenda.
  async retencao() {
    const now = Date.now();
    const JANELA = 540; // lookback ~18 meses (base recuperável)
    const LIM_ATIVO = 90, LIM_RISCO = 180;
    const desde = new Date(now - JANELA * 86400000);
    const appts = await this.prisma.appointment.findMany({
      where: { date: { gte: desde, lte: new Date(now) }, status: { notIn: ['CANCELED', 'CANCELLED', 'MISSED'] as any } },
      select: { tutorId: true, date: true, value: true, type: true, description: true, tutor: { select: { name: true } } },
    });
    const isFisio = (t?: string | null, d?: string | null) => /fisio|reabilit|hidroester/.test(`${t || ''} ${d || ''}`.toLowerCase());
    const map = new Map<string, any>();
    for (const a of appts) {
      if (!a.tutorId) continue;
      if (!map.has(a.tutorId)) map.set(a.tutorId, { tutorId: a.tutorId, nome: a.tutor?.name || 'Cliente', clin: { last: 0, val: 0 }, fis: { last: 0, val: 0 } });
      const g = map.get(a.tutorId);
      const ts = new Date(a.date).getTime();
      const linha = isFisio(a.type, a.description) ? g.fis : g.clin;
      if (ts > linha.last) linha.last = ts;
      linha.val += Number(a.value) || 0;
    }
    const mkLinha = () => ({ total: 0, ativos: { n: 0, valor: 0 }, risco: { n: 0, valor: 0 }, inativos: { n: 0, valor: 0 } });
    const clinico = mkLinha(), fisio = mkLinha();
    const topInativos: any[] = [];
    for (const g of map.values()) {
      for (const [linha, dest, nome] of [[g.clin, clinico, 'Clínico'], [g.fis, fisio, 'Fisio']] as any[]) {
        if (!linha.last) continue;
        const dias = Math.floor((now - linha.last) / 86400000);
        dest.total++;
        const bucket = dias <= LIM_ATIVO ? dest.ativos : dias <= LIM_RISCO ? dest.risco : dest.inativos;
        bucket.n++; bucket.valor += linha.val;
        if (dias > LIM_ATIVO) topInativos.push({ tutorId: g.tutorId, nome: g.nome, linha: nome, dias, valor: linha.val });
      }
    }
    topInativos.sort((a, b) => b.valor - a.valor);
    // Churn de pacotes de fisioterapia
    let pc: any = { ATIVO: 0, CONCLUIDO: 0, CANCELADO: 0, EXPIRADO: 0 };
    try {
      const pacs = await this.prisma.pacote.groupBy({ by: ['status'], _count: true });
      for (const p of pacs as any[]) pc[p.status] = p._count;
    } catch { /* modelo pode não ter dados */ }
    const ativosPac = await this.prisma.pacote.findMany({ where: { status: 'ATIVO' as any, sessoesUsadas: { gt: 0 } }, select: { totalSessoes: true, sessoesUsadas: true } }).catch(() => [] as any[]);
    const ultimaSessao = ativosPac.filter((p: any) => p.totalSessoes > 0 && p.sessoesUsadas >= p.totalSessoes - 1).length;
    const fechados = pc.CONCLUIDO + pc.CANCELADO + pc.EXPIRADO;
    const taxaConclusao = fechados ? Math.round((pc.CONCLUIDO / fechados) * 100) : null;
    return {
      janelaDias: JANELA, limites: { ativo: LIM_ATIVO, risco: LIM_RISCO },
      linhas: { clinico, fisio },
      pacotesFisio: { ativo: pc.ATIVO, ultimaSessao, concluido: pc.CONCLUIDO, cancelado: pc.CANCELADO, expirado: pc.EXPIRADO, taxaConclusao },
      topInativos: topInativos.slice(0, 25),
    };
  }

  // RFM (Recência-Frequência-Monetário) em LOTE + níveis de relacionamento + key accounts.
  // Usa a MESMA lógica de score da ficha (getScoreClient), agora com LTV real → níveis coerentes.
  async rfm() {
    const now = Date.now();
    const appts = await this.prisma.appointment.findMany({
      where: { status: { notIn: ['CANCELED', 'CANCELLED', 'MISSED'] as any } },
      select: { tutorId: true, date: true, value: true, tutor: { select: { name: true } } },
    });
    const map = new Map<string, any>();
    for (const a of appts) {
      if (!a.tutorId) continue;
      const ts = new Date(a.date).getTime();
      if (ts > now) continue; // ignora futuros
      if (!map.has(a.tutorId)) map.set(a.tutorId, { tutorId: a.tutorId, nome: a.tutor?.name || 'Cliente', last: 0, freq: 0, mon: 0 });
      const g = map.get(a.tutorId);
      if (ts > g.last) g.last = ts;
      g.freq += 1; g.mon += Number(a.value) || 0;
    }
    const arr = [...map.values()].map((g) => ({ ...g, recDias: Math.floor((now - g.last) / 86400000) }));
    if (!arr.length) return { total: 0, niveis: [], segmentos: [], keyAccounts: [] };

    // Score idêntico ao da ficha (visitas 30 + LTV 30 + recência 25; NPS placeholder 0) → nível
    const scoreDe = (g: any) => {
      const visitas = Math.min(30, g.freq);
      const ltv = Math.min(30, Math.floor(g.mon / 100));
      let rec = 0;
      if (g.recDias <= 30) rec = 25; else if (g.recDias <= 90) rec = 18; else if (g.recDias <= 180) rec = 10; else if (g.recDias <= 365) rec = 5;
      return visitas + ltv + rec;
    };
    const nivelDe = (s: number) => (s >= 80 ? 'Diamante' : s >= 60 ? 'Ouro' : s >= 40 ? 'Prata' : 'Bronze');

    // Escores RFM 1-5 por quintil
    const rank5 = (get: (x: any) => number, higherBetter: boolean) => {
      const sorted = [...arr].sort((a, b) => get(a) - get(b));
      const n = sorted.length;
      const m = new Map<string, number>();
      sorted.forEach((it, i) => { const q = Math.min(4, Math.floor((i / n) * 5)); m.set(it.tutorId, higherBetter ? q + 1 : 5 - q); });
      return m;
    };
    const R = rank5((x) => x.recDias, false); // menos dias = melhor
    const F = rank5((x) => x.freq, true);
    const M = rank5((x) => x.mon, true);

    const segmentoDe = (r: number, f: number, m: number) => {
      if (r >= 4 && f >= 4 && m >= 4) return 'Campeões';
      if (f >= 4 && r >= 3) return 'Fiéis';
      if (r >= 4 && f <= 2) return 'Promissores';
      if (r === 3 && f >= 3) return 'Precisam de atenção';
      if (r <= 2 && (m >= 4 || f >= 3)) return 'Em risco';
      if (r <= 2 && f <= 2) return 'Hibernando';
      return 'Regulares';
    };

    const enriched = arr.map((g) => {
      const s = scoreDe(g);
      const r = R.get(g.tutorId) || 1, f = F.get(g.tutorId) || 1, m = M.get(g.tutorId) || 1;
      return { ...g, score: s, nivel: nivelDe(s), r, f, m, segmento: segmentoDe(r, f, m) };
    });

    const aggBy = (key: string, ordem: string[]) => {
      const mm = new Map<string, { n: number; valor: number }>();
      for (const e of enriched) { const k = (e as any)[key]; if (!mm.has(k)) mm.set(k, { n: 0, valor: 0 }); const o = mm.get(k)!; o.n++; o.valor += e.mon; }
      return ordem.filter((k) => mm.has(k)).map((k) => ({ key: k, ...mm.get(k)! }));
    };
    const niveis = aggBy('nivel', ['Diamante', 'Ouro', 'Prata', 'Bronze']);
    const segmentos = aggBy('segmento', ['Campeões', 'Fiéis', 'Promissores', 'Precisam de atenção', 'Regulares', 'Em risco', 'Hibernando']);
    const keyAccounts = enriched
      .filter((e) => e.nivel === 'Diamante' || e.nivel === 'Ouro')
      .sort((a, b) => b.mon - a.mon)
      .slice(0, 40)
      .map((e) => ({ tutorId: e.tutorId, nome: e.nome, nivel: e.nivel, segmento: e.segmento, r: e.r, f: e.f, m: e.m, freq: e.freq, valor: e.mon, recDias: e.recDias }));

    // Persiste o nível de cada cliente (fire-and-forget, no máx. 1x/hora) → aparece em listas/inbox.
    // 4 updates em lote (um por nível) em vez de um por cliente.
    if (Date.now() - this.ultimoPersistNivel > 3600_000) {
      this.ultimoPersistNivel = Date.now();
      const byNivel: Record<string, string[]> = { Diamante: [], Ouro: [], Prata: [], Bronze: [] };
      for (const e of enriched) (byNivel[e.nivel] ||= []).push(e.tutorId);
      (async () => {
        for (const [niv, ids] of Object.entries(byNivel)) {
          if (ids.length) { try { await this.prisma.tutor.updateMany({ where: { id: { in: ids } }, data: { nivelRelacionamento: niv } }); } catch { /* nao trava o painel */ } }
        }
      })().catch(() => undefined);
    }
    return { total: enriched.length, niveis, segmentos, keyAccounts };
  }

  // Coorte de retenção: por mês de aquisição (1ª visita), % que voltou em até 1..N meses.
  async coorte() {
    const now = new Date();
    const N = 6;
    const desde = new Date(now.getFullYear() - 1, now.getMonth(), 1); // coortes dos últimos ~12 meses
    const appts = await this.prisma.appointment.findMany({
      where: { status: { notIn: ['CANCELED', 'CANCELLED', 'MISSED'] as any }, date: { lte: now } },
      select: { tutorId: true, date: true },
    });
    const byTutor = new Map<string, Date[]>();
    for (const a of appts) {
      if (!a.tutorId) continue;
      if (!byTutor.has(a.tutorId)) byTutor.set(a.tutorId, []);
      byTutor.get(a.tutorId)!.push(new Date(a.date));
    }
    const addMonths = (d: Date, n: number) => { const x = new Date(d); x.setMonth(x.getMonth() + n); return x; };
    const ym = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const cohort = new Map<string, { size: number; ret: number[] }>();
    for (const [, datas] of byTutor) {
      datas.sort((a, b) => a.getTime() - b.getTime());
      const first = datas[0];
      if (first < desde) continue; // só coortes recentes
      const key = ym(first);
      if (!cohort.has(key)) cohort.set(key, { size: 0, ret: new Array(N).fill(0) });
      const c = cohort.get(key)!;
      c.size++;
      for (let n = 1; n <= N; n++) {
        const limite = addMonths(first, n);
        if (datas.some((d) => d > first && d <= limite)) c.ret[n - 1]++;
      }
    }
    const linhas = [...cohort.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([key, c]) => {
      const [y, m] = key.split('-').map(Number);
      const cohortStart = new Date(y, m - 1, 1);
      const retencao = c.ret.map((r, i) => (addMonths(cohortStart, i + 1) <= now ? Math.round((r / c.size) * 100) : null));
      return { mes: key, tamanho: c.size, retencao };
    });
    return { N, linhas };
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

  // Vendas — gráficos (Fase 3): total/ticket + evolução (bucketizada) + por grupo/marca + top itens.
  async vendasResumo(query: any = {}) {
    const from = query?.from, to = query?.to;
    const where: any = { value: { gt: 0 }, status: { not: 'CANCELLED' } };
    if (from || to) { where.date = {}; if (from) where.date.gte = new Date(String(from) + 'T00:00:00'); if (to) where.date.lte = new Date(String(to) + 'T23:59:59'); }
    const appts = await this.prisma.appointment.findMany({
      where,
      select: { value: true, date: true, items: { select: { grupo: true, marca: true, valorTotal: true, descricao: true } } },
    });
    const total = appts.reduce((s, a) => s + (Number(a.value) || 0), 0);
    const count = appts.length;
    const ticket = count ? total / count : 0;
    const porDia = new Map<string, number>();
    for (const a of appts) { const d = new Date(a.date).toISOString().slice(0, 10); porDia.set(d, (porDia.get(d) || 0) + (Number(a.value) || 0)); }
    const evolucao = this.bucketizeEvolucao(from, to, porDia);
    const MARCAS: Record<string, string> = { EMPORIO: 'EMPORIO', MUNDO_A_PARTE: 'MUNDO_A_PARTE', DRA_VIVIAN: 'DRA_VIVIAN' };
    const porGrupo = new Map<string, number>(), porMarca = new Map<string, number>(), topItens = new Map<string, number>();
    for (const a of appts) for (const it of (a.items || [])) {
      const v = Number(it.valorTotal) || 0;
      porGrupo.set(it.grupo || 'Sem grupo', (porGrupo.get(it.grupo || 'Sem grupo') || 0) + v);
      const m = MARCAS[it.marca as string] || 'Sem marca'; porMarca.set(m, (porMarca.get(m) || 0) + v);
      const nm = it.descricao || 'Item'; topItens.set(nm, (topItens.get(nm) || 0) + v);
    }
    const toArr = (mp: Map<string, number>) => [...mp.entries()].map(([nome, valor]) => ({ nome, valor })).sort((a, b) => b.valor - a.valor);
    return { total, count, ticket, evolucao, porGrupo: toArr(porGrupo), porMarca: toArr(porMarca), topItens: toArr(topItens).slice(0, 8) };
  }

  private bucketizeEvolucao(from: string, to: string, porDia: Map<string, number>) {
    if (!from || !to) return [...porDia.entries()].sort().map(([d, v]) => ({ label: `${d.slice(8, 10)}/${d.slice(5, 7)}`, valor: v }));
    const start = new Date(from + 'T00:00:00'), end = new Date(to + 'T00:00:00');
    const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
    const n = Math.min(8, days), per = Math.ceil(days / n);
    const out: { label: string; valor: number }[] = [];
    for (let i = 0; i < days; i += per) {
      const bStart = new Date(start.getTime() + i * 86400000);
      const bEnd = new Date(start.getTime() + Math.min(i + per - 1, days - 1) * 86400000);
      let sum = 0;
      for (let d = new Date(bStart); d <= bEnd; d = new Date(d.getTime() + 86400000)) sum += porDia.get(d.toISOString().slice(0, 10)) || 0;
      const dd = (x: Date) => String(x.getDate()).padStart(2, '0');
      out.push({ label: per > 1 ? `${dd(bStart)}–${dd(bEnd)}` : `${dd(bStart)}/${String(bStart.getMonth() + 1).padStart(2, '0')}`, valor: sum });
    }
    return out;
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
      id: a.id, numeroVenda: a.numeroVenda ?? null, tutor: a.tutor?.name || '', pet: a.pet?.name || '',
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
          include: { appointment: { select: { id: true, value: true, numeroVenda: true, codigoExterno: true, pet: { select: { name: true } }, tutor: { select: { name: true } } } } },
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

    // garante o número sequencial da venda (rede de segurança: toda venda que recebe pagamento tem número)
    if (appointmentId) { try { await ensureNumeroVenda(this.prisma, appointmentId); } catch (e) { console.error('numeroVenda (recebimento) falhou:', e); } }

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
          await this.criarPlanosDaVenda(ap.id); // #4 Fatia 1-B — venda de item-plano cria o plano na ficha
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
        const vendidos = Math.max(1, Math.round(Number(it.quantidade) || 1));
        // 1) Tem FICHA TÉCNICA? baixa os INSUMOS (não o "pai"). Ex.: procedimento consome placa+parafusos.
        const comps = await this.prisma.produtoComposicao.findMany({ where: { paiId: it.productId }, select: { itemId: true, quantidade: true } });
        if (comps.length > 0) {
          for (const c of comps) {
            const insumo = await this.prisma.product.findUnique({ where: { id: c.itemId }, select: { type: true, stock: true } });
            if (!insumo || insumo.type === 'SERVICE') continue;
            const q = Math.max(0, Math.round((Number(c.quantidade) || 0) * vendidos));
            if (q <= 0) continue;
            const antes = insumo.stock, depois = antes - q;
            await this.prisma.product.update({ where: { id: c.itemId }, data: { stock: depois } });
            await this.prisma.estoqueMovimento.create({
              data: { productId: c.itemId, tipo: 'OUT', quantidade: q, saldoAntes: antes, saldoDepois: depois, motivo: 'Baixa por ficha técnica (venda)', origem: 'COMPOSICAO', refId: appointmentId },
            }).catch(() => undefined);
          }
          continue; // já baixou os insumos; o "pai" (serviço/kit) não movimenta
        }
        // 2) Sem ficha técnica: produto estocável baixa a si mesmo (serviço não movimenta).
        const prod = await this.prisma.product.findUnique({ where: { id: it.productId }, select: { type: true, stock: true } });
        if (!prod || prod.type === 'SERVICE') continue;
        const antes = prod.stock, depois = antes - vendidos;
        await this.prisma.product.update({ where: { id: it.productId }, data: { stock: depois } });
        await this.prisma.estoqueMovimento.create({
          data: { productId: it.productId, tipo: 'OUT', quantidade: vendidos, saldoAntes: antes, saldoDepois: depois, motivo: 'Baixa por venda', origem: 'VENDA', refId: appointmentId },
        }).catch(() => undefined);
      }
    } catch (e: any) {
      // não pode quebrar o recebimento (a venda já foi registrada)
      console.error('baixarEstoqueDaVenda erro:', e?.message);
    }
  }

  // #4 Fatia 1-B — quando a venda é paga, os itens marcados como PLANO geram o plano na ficha do pet:
  //   FISIO → Pacote (sessões = sessões-por-pacote × quantidade)
  //   MEDICAMENTO → ProtocoloAplicado tipo OUTRO (doses = quantidade, espaçadas pelo intervalo)
  // Best-effort: nunca quebra o recebimento. Roda 1x (só na transição p/ PAID).
  private async criarPlanosDaVenda(appointmentId: string) {
    try {
      const ap = await this.prisma.appointment.findUnique({ where: { id: appointmentId }, select: { petId: true, tutorId: true } });
      if (!ap?.petId) return; // sem pet vinculado → não dá pra criar plano na ficha
      const itens = await this.prisma.appointmentItem.findMany({ where: { appointmentId, productId: { not: null } }, select: { productId: true, quantidade: true } });
      for (const it of itens) {
        if (!it.productId) continue;
        const prod = await this.prisma.product.findUnique({ where: { id: it.productId }, select: { name: true, planoTipo: true, planoUnidades: true, planoIntervaloDias: true } });
        if (!prod?.planoTipo) continue;
        const qtd = Math.max(1, Math.round(Number(it.quantidade) || 1));
        if (prod.planoTipo === 'FISIO') {
          const sessoes = Math.max(1, (Number(prod.planoUnidades) || 1) * qtd);
          await this.prisma.pacote.create({
            data: { petId: ap.petId, tutorId: ap.tutorId ?? null, servico: prod.name || 'Fisioterapia', descricao: 'Gerado pela venda no caixa', totalSessoes: sessoes },
          }).catch((e: any) => console.error('criarPlano fisio:', e?.message));
        } else if (prod.planoTipo === 'MEDICAMENTO') {
          const doses = Math.max(1, qtd);
          const intervalo = Math.max(1, Number(prod.planoIntervaloDias) || 30);
          const inicio = new Date();
          const dosesData = Array.from({ length: doses }, (_, k) => ({ numero: k + 1, dataPrevista: new Date(inicio.getTime() + k * intervalo * 86400000), status: 'PENDENTE' }));
          await this.prisma.protocoloAplicado.create({
            data: { petId: ap.petId, tutorId: ap.tutorId ?? null, tipo: 'OUTRO', nomeProtocolo: prod.name || 'Medicamento periódico', dataInicial: inicio, appointmentId, doses: { create: dosesData } },
          }).catch((e: any) => console.error('criarPlano medicamento:', e?.message));
        }
      }
    } catch (e: any) {
      console.error('criarPlanosDaVenda erro:', e?.message);
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
