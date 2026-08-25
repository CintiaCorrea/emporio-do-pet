import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AppointmentsService } from '../appointments/appointments.service';
import { ExamesService } from '../exames/exames.service';
import { RecebimentosService } from '../financeiro/recebimentos.service';
import { LancamentosService } from '../financeiro/lancamentos.service';
import { ensureNumeroVenda } from '../../common/venda-numero';
import * as bcrypt from 'bcryptjs';

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
    private readonly examesService: ExamesService,
    private readonly recebimentos: RecebimentosService,
    private readonly lancamentos: LancamentosService,
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

  // ⭐ Itens mais VENDIDOS (por frequência de linhas de venda) — alimenta o quick-add "Frequentes"
  // da comanda/PDV (1 clique). Devolve no formato do catálogo (id/nome/valorPadrao/custoPadrao).
  async itensFrequentes(limit = 8) {
    const grp = await this.prisma.appointmentItem.groupBy({
      by: ['catalogoItemId'],
      where: { catalogoItemId: { not: null } },
      _count: { catalogoItemId: true },
      orderBy: { _count: { catalogoItemId: 'desc' } },
      take: Math.min(24, Math.max(1, Number(limit) || 8)),
    });
    const ids = grp.map((g) => g.catalogoItemId).filter(Boolean) as string[];
    if (!ids.length) return [];
    const itens = await this.prisma.itemCatalogo.findMany({ where: { id: { in: ids } }, select: { id: true, nome: true, preco: true, custo: true } }).catch(() => [] as any[]);
    const byId = new Map(itens.map((i: any) => [i.id, i]));
    return grp
      .map((g) => { const it: any = byId.get(g.catalogoItemId as string); return it ? { id: it.id, nome: it.nome, valorPadrao: Number(it.preco) || 0, custoPadrao: Number(it.custo) || 0, qtd: g._count.catalogoItemId } : null; })
      .filter(Boolean);
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
      // Só VENDAS entram no "a pagar": consulta/alta clínica (sem numeroVenda) fica de fora.
      // O numeroVenda é atribuído a todo atendimento que nasce como venda (PDV, comanda, saldo migrado).
      where.numeroVenda = { not: null };
      // Agendamento FUTURO não é comanda — só é "conta a receber" o atendimento de hoje/passado
      // (venda do PDV nasce com data de hoje; agendamento de outro dia fica de fora).
      const fimHoje = new Date(); fimHoje.setHours(23, 59, 59, 999);
      where.date = { ...(where.date || {}), lte: fimHoje };
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
    // Churn de pacotes de fisioterapia — lê do controle REAL que a equipe usa
    // (lista petpac_<petId>, a mesma da ficha/inbox/agenda). A tabela Pacote antiga
    // ficava órfã (a agenda nunca a descontava), então dava número irreal.
    let pcAtivo = 0, pcConcluido = 0, ultimaSessao = 0;
    try {
      const itensPac = await this.prisma.listaItem.findMany({ where: { lista: { startsWith: 'petpac_' } }, select: { valor: true } });
      for (const it of itensPac) {
        let d: any = {};
        try { d = JSON.parse(it.valor); } catch { continue; }
        const total = Number(d.total) || 0;
        const used = Number(d.used) || 0;
        const concluido = d.concluido === true || (total > 0 && used >= total);
        if (concluido) { pcConcluido++; }
        else { pcAtivo++; if (total > 0 && used >= total - 1) ultimaSessao++; } // última/penúltima → renovar
      }
    } catch { /* sem pacotes ainda */ }
    // petpac_ não guarda cancelado/expirado (item cancelado é apagado) → 0
    const pc = { ATIVO: pcAtivo, CONCLUIDO: pcConcluido, CANCELADO: 0, EXPIRADO: 0 };
    const totalPac = pcAtivo + pcConcluido;
    const taxaConclusao = totalPac ? Math.round((pcConcluido / totalPac) * 100) : null;
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
      const formas: any[] = (Array.isArray(r.formas) ? (r.formas as any[]).flat() : []).filter((f: any) => f && typeof f === 'object' && !Array.isArray(f));
      let somaF = 0;
      for (const f of formas) { const val = Number(f?.valor) || 0; somaF += val; const nm = f?.forma || "Outro"; porForma.set(nm, (porForma.get(nm) || 0) + val); }
      const resto = v - somaF; // recebimento sem forma / forma parcial → não some, cai em "Outro"
      if (resto > 0.005) porForma.set("Outro", (porForma.get("Outro") || 0) + resto);
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

  /** Item 10 — Previsão de crédito das maquininhas: quanto (LÍQUIDO) ainda vai CAIR e quando.
   *  InfinityPay credita cartão em D+1 e PIX no mesmo dia; dinheiro fica no caixa (não entra aqui).
   *  Líquido = bruto − taxa já lançada (externalId `taxa:<rec>:<idx>`, reusa o cálculo do recebimento).
   *  Mostra só de hoje pra frente (o que ainda não caiu). Informativo — NÃO mexe na DRE/Caixa. */
  async previsaoCredito() {
    const desde = new Date(Date.now() - 45 * 86400000); // vendas dos últimos 45 dias
    const [recs, cfgItens, taxas] = await Promise.all([
      this.prisma.recebimento.findMany({ where: { data: { gte: desde } }, select: { id: true, data: true, formas: true } }),
      this.prisma.listaItem.findMany({ where: { lista: 'formasrecebimento' } }), // prazo de crédito por maquininha (Formas de recebimento)
      this.prisma.lancamento.findMany({ where: { origem: 'CRM' as any, externalId: { startsWith: 'taxa:' } }, select: { externalId: true, valorCentavos: true } }),
    ]);
    const norm = (s: string) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
    // prazo (dias) cadastrado por forma: crédito e débito separados. Vazio → cai no fallback D+1.
    const prazoCfg = new Map<string, { credito: number; debito: number }>();
    for (const c of cfgItens) {
      try { const v = JSON.parse(c.valor); prazoCfg.set(norm(v?.nome), { credito: Number(v?.prazoCredito) || 0, debito: Number(v?.prazoDebito) || 0 }); } catch { /* forma inválida */ }
    }
    const taxaPorRec = new Map<string, number>();
    for (const t of taxas) {
      const recId = String(t.externalId).split(':')[1];
      if (recId) taxaPorRec.set(recId, (taxaPorRec.get(recId) || 0) + t.valorCentavos);
    }
    const ehDinheiro = (s: string) => /dinheiro|esp[eé]cie/i.test(s);
    const ehPix = (s: string) => /pix/i.test(s);
    const ehDebito = (s: string) => /d[eé]bito/i.test(s);
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    const porData = new Map<string, number>(); // dia previsto (ISO) -> líquido em centavos
    let totalCent = 0;
    for (const r of recs) {
      let formas: any[] = [];
      try { formas = Array.isArray(r.formas) ? (r.formas as any[]) : JSON.parse(String(r.formas)); } catch { /* forma inválida */ }
      // bruto das maquininhas (exclui dinheiro) p/ ratear a taxa do recebimento entre as formas
      const brutoMaqTotal = formas.reduce((s: number, f: any) => { const v = Number(f?.valor) || 0; return s + (v > 0 && !ehDinheiro(`${f?.forma || ''} ${f?.modalidade || ''}`) ? v : 0); }, 0);
      if (brutoMaqTotal <= 0) continue;
      const taxaTot = taxaPorRec.get(r.id) || 0;
      for (const f of formas) {
        const nm = `${f?.forma || ''} ${f?.modalidade || ''}`;
        const val = Number(f?.valor) || 0;
        if (val <= 0 || ehDinheiro(nm)) continue; // dinheiro fica no caixa (não é crédito de maquininha)
        const liqCent = Math.max(0, Math.round(val * 100) - Math.round(taxaTot * (val / brutoMaqTotal)));
        // prazo (dias): pix no mesmo dia; senão pelo cadastro da forma (débito/crédito), fallback D+1.
        const cfg = prazoCfg.get(norm(f?.forma));
        const prazo = ehPix(nm) ? 0 : ehDebito(nm) ? (cfg?.debito || 1) : (cfg?.credito || 1);
        const prev = new Date(r.data); prev.setDate(prev.getDate() + prazo); prev.setHours(0, 0, 0, 0);
        if (prev < hoje) continue; // já caiu na conta
        const key = prev.toISOString().slice(0, 10);
        porData.set(key, (porData.get(key) || 0) + liqCent);
        totalCent += liqCent;
      }
    }
    const porDataArr = [...porData.entries()]
      .map(([data, liquidoCentavos]) => ({ data, liquidoCentavos }))
      .sort((a, b) => a.data.localeCompare(b.data));
    return { totalCentavos: totalCent, porData: porDataArr };
  }

  // Vendas — gráficos / BI Fatia 1: evolução RICA (bruto/desconto/líquido/nº vendas/nº
  // itens) com agrupamento dia/semana/mês (groupBy) + por grupo/marca + top itens.
  async vendasResumo(query: any = {}) {
    const from = query?.from, to = query?.to;
    const groupBy = String(query?.groupBy || 'MES').toUpperCase();
    // Fatia 3a — filtros da venda/item
    const fProf = query?.profissionalId || '', fProd = query?.produtoId || '';
    const fGrupo = query?.grupo || '', fMarca = query?.marca || '';
    const fTipo = query?.tipo ? String(query.tipo).toUpperCase() : '';   // PRODUTO | SERVICO
    const fTurno = query?.turno ? String(query.turno).toUpperCase() : ''; // MANHA | TARDE | NOITE
    const parseH = (s: any): number | null => { if (!s) return null; const m = String(s).match(/^(\d{1,2}):?(\d{2})?/); return m ? Number(m[1]) + Number(m[2] || 0) / 60 : null; };
    const hIni = parseH(query?.hIni), hFim = parseH(query?.hFim);
    const hasItemFilter = !!(fProf || fProd || fGrupo || fMarca || fTipo);
    // Fatia 3b — filtros do cliente
    const fPerfil = query?.perfil ? String(query.perfil).toUpperCase() : ''; // NOVOS | RECORRENTES
    const fNps = query?.nps ? String(query.nps).toUpperCase() : '';           // PROMOTOR|NEUTRO|DETRATOR
    const fOrigem = query?.origem || '', fCidade = query?.cidade || '', fBairro = query?.bairro || '';
    const hasClienteFilter = !!(fPerfil || fNps || fOrigem || fCidade || fBairro);

    const where: any = { value: { gt: 0 }, status: { not: 'CANCELLED' } };
    if (from || to) { where.date = {}; if (from) where.date.gte = new Date(String(from) + 'T00:00:00'); if (to) where.date.lte = new Date(String(to) + 'T23:59:59'); }
    const appts = await this.prisma.appointment.findMany({
      where,
      select: { value: true, date: true, tutorId: true, items: { select: { grupo: true, marca: true, valorTotal: true, desconto: true, quantidade: true, descricao: true, productId: true, servicoId: true, executorUserId: true } } },
    });

    const MARCAS: Record<string, string> = { EMPORIO: 'EMPORIO', MUNDO_A_PARTE: 'MUNDO_A_PARTE', DRA_VIVIAN: 'DRA_VIVIAN' };
    const EH_PRODUTO = new Set(['MEDICINE', 'VACCINE', 'KIT']);
    // tipos de produto (p/ o filtro "tipo" e a quebra produto×serviço)
    const prodIds = new Set<string>();
    for (const a of appts) for (const it of (a.items || [])) if (it.productId) prodIds.add(it.productId as string);
    const prods = prodIds.size ? await this.prisma.product.findMany({ where: { id: { in: Array.from(prodIds) } }, select: { id: true, type: true } }) : [];
    const typeMap = new Map(prods.map((p) => [p.id, p.type]));
    const tipoDoItem = (it: any) => { const t = it.productId ? typeMap.get(it.productId as string) : null; return (t && EH_PRODUTO.has(t)) ? 'PRODUTO' : 'SERVICO'; };
    const itemPassa = (it: any) => {
      if (fProf && it.executorUserId !== fProf) return false;
      if (fProd && it.servicoId !== fProd && it.productId !== fProd) return false;
      if (fGrupo && (it.grupo || 'Sem grupo') !== fGrupo) return false;
      if (fMarca && (MARCAS[it.marca as string] || 'Sem marca') !== fMarca) return false;
      if (fTipo && tipoDoItem(it) !== fTipo) return false;
      return true;
    };

    // Dados do cliente (p/ filtros do cliente + opções): cidade/bairro, NPS, origem (por telefone), novo×recorrente
    const tutorIds = Array.from(new Set(appts.map((a: any) => a.tutorId).filter(Boolean))) as string[];
    const tutorsData = tutorIds.length ? await this.prisma.tutor.findMany({ where: { id: { in: tutorIds } }, select: { id: true, city: true, neighborhood: true, contacts: { where: { isPrimary: true }, take: 1, select: { number: true } } } }) : [];
    const tutorMap = new Map(tutorsData.map((t) => [t.id, t]));
    const npsRows = tutorIds.length ? await this.prisma.avaliacaoNPS.findMany({ where: { tutorId: { in: tutorIds } }, select: { tutorId: true, classificacao: true }, orderBy: { createdAt: 'desc' } }) : [];
    const npsMap = new Map<string, string>();
    for (const r of npsRows) if (r.tutorId && !npsMap.has(r.tutorId)) npsMap.set(r.tutorId, r.classificacao as string);
    const firstBuy = tutorIds.length ? await this.prisma.appointment.groupBy({ by: ['tutorId'], where: { tutorId: { in: tutorIds }, value: { gt: 0 } }, _min: { date: true } }) : [];
    const firstMap = new Map<string, Date>();
    for (const f of firstBuy) if (f.tutorId && f._min.date) firstMap.set(f.tutorId, f._min.date as Date);
    const last8 = (s: any) => String(s || '').replace(/\D/g, '').slice(-8);
    const leads = await this.prisma.lead.findMany({ select: { source: true, phone: true } });
    const phoneSrc = new Map<string, string>();
    for (const l of leads) { const k = last8(l.phone); if (k && !phoneSrc.has(k)) phoneSrc.set(k, l.source as string); }
    const origemMap = new Map<string, string>();
    for (const t of tutorsData) { const k = last8((t as any).contacts?.[0]?.number); if (k && phoneSrc.has(k)) origemMap.set(t.id, phoneSrc.get(k)!); }
    const dataFrom = from ? new Date(String(from) + 'T00:00:00') : null;
    const tutorOk = (tid: any): boolean => {
      if (!tid) return false;
      const t: any = tutorMap.get(tid);
      if (fCidade && (t?.city || '') !== fCidade) return false;
      if (fBairro && (t?.neighborhood || '') !== fBairro) return false;
      if (fNps && (npsMap.get(tid) || '') !== fNps) return false;
      if (fOrigem && (origemMap.get(tid) || '') !== fOrigem) return false;
      if (fPerfil) { const fb = firstMap.get(tid); const novo = !!(fb && dataFrom && fb >= dataFrom); if (fPerfil === 'NOVOS' && !novo) return false; if (fPerfil === 'RECORRENTES' && novo) return false; }
      return true;
    };

    const MESN = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    const mondayOf = (d: Date) => { const x = new Date(d); const day = (x.getDay() + 6) % 7; x.setDate(x.getDate() - day); x.setHours(0, 0, 0, 0); return x; };
    const bucketOf = (dt: Date): { key: string; label: string } => {
      if (groupBy === 'DIA') { const k = dt.toISOString().slice(0, 10); return { key: k, label: `${k.slice(8, 10)}/${k.slice(5, 7)}` }; }
      if (groupBy === 'MES') { const k = dt.toISOString().slice(0, 7); return { key: k, label: `${MESN[dt.getUTCMonth()]}/${String(dt.getUTCFullYear()).slice(2)}` }; }
      const m = mondayOf(dt); const k = m.toISOString().slice(0, 10); return { key: k, label: `${k.slice(8, 10)}/${k.slice(5, 7)}` }; // SEMANA
    };

    const buckets = new Map<string, { label: string; bruto: number; desconto: number; liquido: number; qtdVendas: number; qtdItens: number }>();
    let totBruto = 0, totDesc = 0, totLiq = 0, totV = 0, totI = 0;
    const porGrupo = new Map<string, number>(), porMarca = new Map<string, number>(), topItens = new Map<string, number>();
    const TZ = 3 * 3600000; // Fortaleza = UTC-3
    const turno: Record<string, number> = { MANHA: 0, TARDE: 0, NOITE: 0 };
    const diaSemana = [0, 0, 0, 0, 0, 0, 0];
    let vServico = 0, vProduto = 0;
    for (const a of appts) {
      const local = new Date(new Date(a.date).getTime() - TZ);
      const hh = local.getUTCHours(), hf = hh + local.getUTCMinutes() / 60;
      const tur = hh < 12 ? 'MANHA' : hh < 18 ? 'TARDE' : 'NOITE';
      // filtros de nível-venda: turno + faixa de horário
      if (fTurno && tur !== fTurno) continue;
      if (hIni != null && hf < hIni) continue;
      if (hFim != null && hf >= hFim) continue;
      if (hasClienteFilter && !tutorOk(a.tutorId)) continue;
      const allItems = a.items || [];
      const contrib = hasItemFilter ? allItems.filter(itemPassa) : allItems;
      if (hasItemFilter && contrib.length === 0) continue;
      // com filtro de item, a métrica vem só dos itens que passam; senão, do valor da venda
      let liq: number, bruto: number, desc: number, qi: number;
      if (hasItemFilter) {
        bruto = contrib.reduce((s, it: any) => s + (Number(it.valorTotal) || 0) + (Number(it.desconto) || 0), 0);
        liq = contrib.reduce((s, it: any) => s + (Number(it.valorTotal) || 0), 0);
        desc = Math.max(0, bruto - liq);
        qi = contrib.reduce((s, it: any) => s + (Number(it.quantidade) || 0), 0);
      } else {
        liq = Number(a.value) || 0;
        bruto = allItems.length ? allItems.reduce((s, it: any) => s + (Number(it.valorTotal) || 0) + (Number(it.desconto) || 0), 0) : liq;
        desc = Math.max(0, bruto - liq);
        qi = allItems.reduce((s, it: any) => s + (Number(it.quantidade) || 0), 0);
      }
      turno[tur] += liq; diaSemana[local.getUTCDay()] += liq;
      const { key, label } = bucketOf(new Date(a.date));
      const b = buckets.get(key) || { label, bruto: 0, desconto: 0, liquido: 0, qtdVendas: 0, qtdItens: 0 };
      b.bruto += bruto; b.desconto += desc; b.liquido += liq; b.qtdVendas += 1; b.qtdItens += qi;
      buckets.set(key, b);
      totBruto += bruto; totDesc += desc; totLiq += liq; totV += 1; totI += qi;
      for (const it of contrib) {
        const v = Number(it.valorTotal) || 0;
        porGrupo.set(it.grupo || 'Sem grupo', (porGrupo.get(it.grupo || 'Sem grupo') || 0) + v);
        const mk = MARCAS[it.marca as string] || 'Sem marca'; porMarca.set(mk, (porMarca.get(mk) || 0) + v);
        const nm = it.descricao || 'Item'; topItens.set(nm, (topItens.get(nm) || 0) + v);
        if (tipoDoItem(it) === 'PRODUTO') vProduto += v; else vServico += v;
      }
    }
    // Pacotes mais vendidos (fonte viva petpac_, no período)
    const petpac = await this.prisma.listaItem.findMany({ where: { lista: { startsWith: 'petpac_' } }, select: { valor: true } });
    const ini = from ? new Date(String(from) + 'T00:00:00') : null;
    const fim = to ? new Date(String(to) + 'T23:59:59') : null;
    const pacCount = new Map<string, number>();
    for (const it of petpac) {
      let d: any = {}; try { d = JSON.parse(it.valor); } catch { continue; }
      const dtc = d.createdAt ? new Date(d.createdAt) : null;
      if (ini && dtc && dtc < ini) continue;
      if (fim && dtc && dtc > fim) continue;
      const nm = d.nome || 'Pacote'; pacCount.set(nm, (pacCount.get(nm) || 0) + 1);
    }
    const pacotesTop = [...pacCount.entries()].map(([nome, qtd]) => ({ nome, qtd })).sort((a, b) => b.qtd - a.qtd).slice(0, 8);

    // Opções dos filtros (do período, independentes dos filtros ativos)
    const opGrupos = new Set<string>(), opMarcas = new Set<string>();
    for (const a of appts) for (const it of (a.items || [])) { if (it.grupo) opGrupos.add(it.grupo); if (it.marca) opMarcas.add(MARCAS[it.marca as string] || String(it.marca)); }
    const opCidades = new Set<string>(), opBairros = new Set<string>(), opOrigens = new Set<string>();
    for (const t of tutorsData) { if (t.city) opCidades.add(t.city); if (t.neighborhood) opBairros.add(t.neighborhood); }
    for (const v of origemMap.values()) opOrigens.add(v);

    const evolucao = [...buckets.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([, v]) => v);
    const toArr = (mp: Map<string, number>) => [...mp.entries()].map(([nome, valor]) => ({ nome, valor })).sort((a, b) => b.valor - a.valor);
    return {
      total: totLiq, count: totV, ticket: totV ? totLiq / totV : 0,
      totais: { bruto: totBruto, desconto: totDesc, liquido: totLiq, qtdVendas: totV, qtdItens: totI, ticket: totV ? totLiq / totV : 0 },
      groupBy, evolucao,
      porGrupo: toArr(porGrupo), porMarca: toArr(porMarca), topItens: toArr(topItens).slice(0, 8),
      porTurno: turno, porDiaSemana: diaSemana, produtoServico: { servico: vServico, produto: vProduto }, pacotesTop,
      opcoes: { grupos: [...opGrupos].sort(), marcas: [...opMarcas], cidades: [...opCidades].sort(), bairros: [...opBairros].sort(), origens: [...opOrigens].sort() },
    };
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
    // 🔒 Trava: só um caixa aberto por vez. Evita que a venda do PDV caia num caixa
    // diferente do que a operadora está olhando (o PDV mira "o último aberto").
    const jaAberto = await this.prisma.caixaSessao.findFirst({ where: { status: 'ABERTO' }, select: { numero: true } });
    if (jaAberto) {
      throw new BadRequestException(`Já existe um caixa aberto (nº ${jaAberto.numero}). Feche ou encerre ele antes de abrir outro.`);
    }
    const count = await this.prisma.caixaSessao.count();
    // Caixa retroativo: permite abrir com uma data passada (backfill). Meio-dia p/ evitar borda de fuso.
    const abertura = dto.abertura ? new Date(String(dto.abertura).slice(0, 10) + 'T12:00:00') : undefined;
    return this.prisma.caixaSessao.create({
      data: {
        numero: count + 1,
        userId: dto.userId || userId,
        suprimento: Number(dto.suprimento || 0),
        observacao: dto.observacao || null,
        ...(abertura ? { abertura } : {}),
      },
      include: { user: { select: { id: true, name: true } }, recebimentos: true },
    });
  }

  // Corrige o valor de abertura (suprimento) de um caixa AINDA aberto. Não mexe em caixa
  // fechado/encerrado (mudaria a conferência já feita).
  async editarSuprimento(id: string, suprimento: number) {
    const c = await this.prisma.caixaSessao.findUnique({ where: { id }, select: { status: true } });
    if (!c) throw new NotFoundException('Caixa não encontrado');
    if (c.status !== 'ABERTO') throw new BadRequestException('Só dá para editar o valor de abertura enquanto o caixa está aberto.');
    return this.prisma.caixaSessao.update({
      where: { id },
      data: { suprimento: Number(suprimento || 0) },
      include: { user: { select: { id: true, name: true } }, recebimentos: true, movimentos: true },
    });
  }

  async fechar(id: string, dto: any = {}) {
    const valorEsperado = dto.valorEsperado != null ? Number(dto.valorEsperado) : null;
    const valorContado = dto.valorContado != null ? Number(dto.valorContado) : null;
    const diferenca = (valorEsperado != null && valorContado != null)
      ? Number((valorContado - valorEsperado).toFixed(2)) : null;
    // status alvo: 'FECHADO' (encerrar) ou 'EM_REVISAO' (colocar em revisão). fechamento pode vir do modal.
    const status = String(dto.status || '').toUpperCase() === 'EM_REVISAO' ? 'EM_REVISAO' : 'FECHADO';
    const fechamento = dto.fechamento ? new Date(dto.fechamento) : new Date();
    return this.prisma.caixaSessao.update({
      where: { id },
      data: {
        status, fechamento,
        valorEsperado, valorContado, diferenca,
        obsFechamento: dto.observacao || null,
      },
    });
  }

  // Grade de caixas (todos os dias) filtrável por período + status.
  async listCaixasGrade(query: any = {}) {
    const { from, to, status } = query || {};
    const where: any = {};
    if (from || to) { where.abertura = {}; if (from) where.abertura.gte = new Date(String(from) + 'T00:00:00'); if (to) where.abertura.lte = new Date(String(to) + 'T23:59:59'); }
    if (status) where.status = String(status).toUpperCase();
    return this.prisma.caixaSessao.findMany({
      where, orderBy: { abertura: 'desc' }, take: 300,
      select: { id: true, numero: true, status: true, abertura: true, fechamento: true, valorEsperado: true, valorContado: true, diferenca: true, user: { select: { name: true } } },
    });
  }

  // Muda o status do caixa (ABERTO/FECHADO/ENCERRADO/EM_REVISAO). Status é String no schema.
  async setStatusCaixa(id: string, status: string) {
    const S = String(status || '').toUpperCase();
    if (!['ABERTO', 'FECHADO', 'ENCERRADO', 'EM_REVISAO'].includes(S)) throw new BadRequestException('Status inválido');
    const ex = await this.prisma.caixaSessao.findUnique({ where: { id }, select: { id: true } });
    if (!ex) throw new NotFoundException('Caixa nao encontrado');
    const data: any = { status: S };
    if (S === 'ABERTO') data.fechamento = null;
    else if (S === 'FECHADO' || S === 'ENCERRADO') data.fechamento = new Date();
    return this.prisma.caixaSessao.update({ where: { id }, data });
  }

  async reabrir(id: string, dto: any = {}) {
    // 🔒 Mesma trava do abrir: não reabrir se já houver outro caixa ABERTO (evita 2 abertos).
    const outroAberto = await this.prisma.caixaSessao.findFirst({ where: { status: 'ABERTO', id: { not: id } }, select: { numero: true } });
    if (outroAberto) {
      throw new BadRequestException(`Já existe um caixa aberto (nº ${outroAberto.numero}). Feche ele antes de reabrir este.`);
    }
    // Guarda o motivo da reabertura no histórico (obsFechamento), sem perder a observação anterior.
    const cur = await this.prisma.caixaSessao.findUnique({ where: { id }, select: { obsFechamento: true } });
    const motivo = String(dto.observacao || '').trim();
    const nota = motivo ? `${cur?.obsFechamento ? cur.obsFechamento + ' | ' : ''}Reaberto: ${motivo}` : (cur?.obsFechamento || null);
    return this.prisma.caixaSessao.update({ where: { id }, data: { status: 'ABERTO', fechamento: null, obsFechamento: nota } });
  }

  // Lê as regras do módulo de vendas (lista `configvendas`, 1 item JSON).
  private async getConfigVendas(): Promise<any> {
    try { const it = await this.prisma.listaItem.findFirst({ where: { lista: 'configvendas' } }); if (it?.valor) return JSON.parse(it.valor); } catch { /* usa vazio */ }
    return {};
  }

  async registrarRecebimento(caixaId: string, dto: any, userId: string) {
    const appointmentId = dto.appointmentId || null;
    // Normaliza: achata malformado (ex.: [[]] de baixa sem forma) e mantém só objetos {forma,valor} válidos.
    const formas = (Array.isArray(dto.formas) ? (dto.formas as any[]).flat() : []).filter((f: any) => f && typeof f === 'object' && !Array.isArray(f));
    // 🔒 Trava anti-"Outros": um recebimento com valor NÃO pode entrar sem forma de pagamento.
    // (era a raiz das baixas que caíam em "Outros" e não contavam no dinheiro — formas `[[]]`.)
    const somaFormasRec = formas.reduce((s: number, f: any) => s + Number(f.valor || 0), 0);
    if (Number(dto.valorTotal || 0) > 0.005 && somaFormasRec <= 0.005) {
      // 🔎 DIAGNÓSTICO: registra o que chegou (algumas telas mandam formas vazias/mal-formadas).
      console.error('[recebimento sem forma] valorTotal=', dto.valorTotal, 'formasRaw=', JSON.stringify(dto.formas), 'obs=', dto.observacao);
      throw new BadRequestException('Informe a forma de recebimento — o valor não pode entrar no caixa sem forma.');
    }
    // Config de vendas: obrigar NSU do cartão. Detecta cartão pela MODALIDADE (Débito/Crédito que o
    // PDV manda) OU pelo nome (cart/maquin) — assim maquininhas com nome próprio (InfinityPay, Nubank)
    // também exigem NSU. A baixa de comanda (sem modalidade e nome não-cartão) não é afetada.
    const ehCartao = (f: any) => !!String(f.modalidade || '').trim() || /cart|maquin/i.test(f.forma || '');
    const cfgRec = await this.getConfigVendas();
    if (cfgRec.obrigarNsu && formas.some((f: any) => ehCartao(f) && !String(f.nsu || '').trim())) {
      throw new BadRequestException('Informe o NSU do cartão (a configuração de vendas exige — usado na conciliação).');
    }
    // Só "Crédito do pet/cliente" debita o saldo do cliente. ⚠️ NÃO usar /crédito/ solto: casaria
    // com "Cartão crédito" e trataria pagamento no cartão como uso de saldo (mesma regex do DRE).
    const creditoUsado = formas
      .filter((f: any) => /cr[eé]dito d[oe] (pet|client)/i.test(f.forma || '') || /cr[eé]dito do cliente/i.test(f.forma || ''))
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

    // Caixa retroativo: o recebimento (e a venda) caem no DIA do caixa, não em "agora".
    const caixaSes = await this.prisma.caixaSessao.findUnique({ where: { id: caixaId }, select: { abertura: true } });
    const caixaData = caixaSes?.abertura ?? new Date();
    const hoje0 = new Date(); hoje0.setHours(0, 0, 0, 0);
    const caixaDia0 = new Date(caixaData); caixaDia0.setHours(0, 0, 0, 0);
    const retroativo = caixaDia0 < hoje0;
    if (retroativo && appointmentId) {
      try { await this.prisma.appointment.update({ where: { id: appointmentId }, data: { date: caixaData } }); } catch { /* nao trava o recebimento */ }
    }

    const rec = await this.prisma.recebimento.create({
      data: {
        caixaSessaoId: caixaId, appointmentId,
        valorTotal: Number(dto.valorTotal || 0),
        desconto: Number(dto.desconto || 0),
        troco: Number(dto.troco || 0),
        formas,
        observacao: dto.observacao || null,
        data: caixaData,
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

    // ⚡ TEMPO REAL: gera o lançamento financeiro DESTA venda na hora (não só ao abrir o DRE) → saldo/DRE
    // sempre atuais. Fire-and-forget: não trava/atrasa o recebimento; a rede de segurança (cron) cobre falhas.
    if (appointmentId) this.recebimentos.processar(appointmentId).catch(() => undefined);

    return rec;
  }

  // Fase 5 — quando a venda é paga, desconta o estoque dos PRODUTOS estocáveis (serviço não baixa).
  // #4 — usa baixa segura: transação (saldo+movimento juntos), NUNCA negativa, loga discrepâncias.
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
            const insumo = await this.prisma.product.findUnique({ where: { id: c.itemId }, select: { type: true } });
            if (!insumo || insumo.type === 'SERVICE') continue;
            await this.baixarUmItem(c.itemId, Math.round((Number(c.quantidade) || 0) * vendidos), 'Baixa por ficha técnica (venda)', 'COMPOSICAO', appointmentId);
          }
          continue; // o "pai" (serviço/kit) não movimenta
        }
        // 2) Sem ficha técnica: produto estocável baixa a si mesmo (serviço não movimenta).
        const prod = await this.prisma.product.findUnique({ where: { id: it.productId }, select: { type: true } });
        if (!prod || prod.type === 'SERVICE') continue;
        await this.baixarUmItem(it.productId, vendidos, 'Baixa por venda', 'VENDA', appointmentId);
      }
    } catch (e: any) {
      // não pode quebrar o recebimento (a venda já foi registrada)
      console.error('baixarEstoqueDaVenda erro:', e?.message);
    }
  }

  // #4 — baixa segura de UM item na venda: tudo numa transação (saldo + movimento juntos),
  // NUNCA deixa o estoque negativar (baixa só até zerar) e LOGA a discrepância (não engole erro).
  private async baixarUmItem(productId: string, qDesejado: number, motivo: string, origem: string, appointmentId: string) {
    const q = Math.max(0, Math.round(qDesejado || 0));
    if (q <= 0) return;
    try {
      await this.prisma.$transaction(async (tx) => {
        const prod = await tx.product.findUnique({ where: { id: productId }, select: { name: true, stock: true } });
        if (!prod) return;
        const antes = prod.stock;
        const real = Math.min(q, Math.max(0, antes)); // nunca deixa negativar: baixa no máximo o que há
        if (real <= 0) { console.warn(`[estoque] venda ${appointmentId}: "${prod.name}" sem saldo (tinha ${antes}, pedia ${q}) — não baixou.`); return; }
        if (real < q) console.warn(`[estoque] venda ${appointmentId}: "${prod.name}" saldo insuficiente (tinha ${antes}, pedia ${q}) — baixou ${real} e zerou o estoque.`);
        const depois = antes - real;
        await tx.product.update({ where: { id: productId }, data: { stock: depois } });
        await tx.estoqueMovimento.create({ data: { productId, tipo: 'OUT', quantidade: real, saldoAntes: antes, saldoDepois: depois, motivo, origem, refId: appointmentId } });
      });
    } catch (e: any) {
      console.error(`[estoque] falha ao baixar ${productId} da venda ${appointmentId}:`, e?.message);
    }
  }

  // #4 Fatia 1-B — quando a venda é paga, os itens marcados como PLANO geram o plano na ficha do pet:
  //   FISIO → pacote na lista petpac_<petId> (MESMO formato do lançamento manual da ficha/inbox),
  //           pra aparecer na ficha/inbox e DESCONTAR a sessão pela agenda quando o pet chega.
  //   MEDICAMENTO → ProtocoloAplicado tipo OUTRO (doses = quantidade, espaçadas pelo intervalo)
  // Best-effort: nunca quebra o recebimento. Roda 1x (só na transição p/ PAID) e é idempotente.
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
          // Cria no MESMO formato que o pacote manual (ficha/inbox) → agenda desconta sozinho.
          // Idempotente: marca a origem (venda+produto) e não recria se já existir.
          const origemVenda = `venda:${appointmentId}:${it.productId}`;
          const jaExiste = await this.prisma.listaItem.findFirst({ where: { lista: `petpac_${ap.petId}`, valor: { contains: origemVenda } } });
          if (!jaExiste) {
            await this.prisma.listaItem.create({
              data: { lista: `petpac_${ap.petId}`, valor: JSON.stringify({ serviceId: it.productId, nome: prod.name || 'Fisioterapia', total: sessoes, used: 0, createdAt: new Date().toISOString(), baixas: [], origem: 'venda', origemVenda }) },
            }).catch((e: any) => console.error('criarPlano fisio (petpac_):', e?.message));
          }
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

      // 🔗 PONTE do CATÁLOGO NOVO: itens vendidos com catalogoItemId + controlePlano criam o MESMO
      // controle do antigo — SESSOES → petpac_ (patinhas/agenda), DOSES → protocolo programado (lembrete).
      const itensNovo = await this.prisma.appointmentItem.findMany({ where: { appointmentId, catalogoItemId: { not: null } }, select: { catalogoItemId: true, quantidade: true } });
      for (const it of itensNovo) {
        if (!it.catalogoItemId) continue;
        const item = await this.prisma.itemCatalogo.findUnique({ where: { id: it.catalogoItemId }, select: { nome: true, controlePlano: true, planoUnidades: true, planoIntervaloDias: true } });
        if (!item?.controlePlano) continue;
        const qtd = Math.max(1, Math.round(Number(it.quantidade) || 1));
        const unidades = Math.max(1, (Number(item.planoUnidades) || 1) * qtd);
        if (item.controlePlano === 'SESSOES') {
          const origemVenda = `venda:${appointmentId}:${it.catalogoItemId}`;
          const jaExiste = await this.prisma.listaItem.findFirst({ where: { lista: `petpac_${ap.petId}`, valor: { contains: origemVenda } } });
          if (!jaExiste) {
            await this.prisma.listaItem.create({
              data: { lista: `petpac_${ap.petId}`, valor: JSON.stringify({ serviceId: it.catalogoItemId, nome: item.nome || 'Pacote', total: unidades, used: 0, createdAt: new Date().toISOString(), baixas: [], origem: 'venda', origemVenda }) },
            }).catch((e: any) => console.error('criarPlano SESSOES (novo):', e?.message));
          }
        } else if (item.controlePlano === 'DOSES') {
          const jaDose = await this.prisma.protocoloAplicado.findFirst({ where: { appointmentId, nomeProtocolo: item.nome || 'Plano de doses' } });
          if (!jaDose) {
            const intervalo = Math.max(1, Number(item.planoIntervaloDias) || 30);
            const inicio = new Date();
            const dosesData = Array.from({ length: unidades }, (_, k) => ({ numero: k + 1, dataPrevista: new Date(inicio.getTime() + k * intervalo * 86400000), status: 'PENDENTE' }));
            await this.prisma.protocoloAplicado.create({
              data: { petId: ap.petId, tutorId: ap.tutorId ?? null, tipo: 'OUTRO', nomeProtocolo: item.nome || 'Plano de doses', dataInicial: inicio, appointmentId, doses: { create: dosesData } },
            }).catch((e: any) => console.error('criarPlano DOSES (novo):', e?.message));
          }
        }
      }
    } catch (e: any) {
      console.error('criarPlanosDaVenda erro:', e?.message);
    }
  }

  async registrarMovimento(caixaId: string, dto: any, userId: string) {
    const caixa = await this.prisma.caixaSessao.findUnique({ where: { id: caixaId } });
    if (!caixa) throw new NotFoundException('Caixa nao encontrado');
    const mov = await this.prisma.caixaMovimento.create({
      data: {
        caixaSessaoId: caixaId,
        tipo: String(dto.tipo || 'SANGRIA').toUpperCase(),
        valor: Number(dto.valor || 0),
        forma: dto.forma || null,
        conta: dto.conta || null,
        descricao: dto.descricao || null,
        observacao: dto.observacao || null,
        data: caixa.abertura, // caixa retroativo: movimento cai no dia do caixa
        createdById: userId,
      },
    });
    // Movimento do caixa → financeiro (tempo real; fire-and-forget, não trava o caixa):
    const tp = String(dto.tipo).toUpperCase();
    if (tp === 'DESPESA' && Number(dto.valor) > 0 && dto.categoriaId) {
      await this.despesaCaixaFinanceiro(mov, dto).catch(() => undefined); // gasto → DESPESA no DRE + reduz saldo
    } else if ((tp === 'SANGRIA' || tp === 'SUPRIMENTO' || tp === 'TRANSFERENCIA') && Number(dto.valor) > 0) {
      await this.transferenciaCaixaFinanceiro(mov, dto).catch(() => undefined); // dinheiro muda de conta → saldo
    }
    return mov;
  }

  /** Sangria/Suprimento/Transferência = dinheiro mudando de conta → TRANSFERENCIA (neutra no DRE, mexe no saldo). */
  private async transferenciaCaixaFinanceiro(mov: any, dto: any): Promise<void> {
    const cash = await this.contaDinheiro();
    const tp = String(dto.tipo).toUpperCase();
    let origemId: string | null = null, destinoId: string | null = null;
    if (tp === 'SANGRIA') { origemId = cash; destinoId = dto.contaDestinoId || null; }        // sai do caixa (Espécie)
    else if (tp === 'SUPRIMENTO') { origemId = dto.contaOrigemId || null; destinoId = cash; }  // entra no caixa (Espécie)
    else { origemId = dto.contaOrigemId || null; destinoId = dto.contaDestinoId || null; }     // transferência livre
    if (!origemId || !destinoId || origemId === destinoId) return; // precisa das duas contas
    const data = mov?.data ? new Date(mov.data) : new Date();
    const label: Record<string, string> = { SANGRIA: 'Sangria', SUPRIMENTO: 'Suprimento', TRANSFERENCIA: 'Transferência' };
    await this.lancamentos.create({
      tipo: 'TRANSFERENCIA',
      valorCentavos: Math.round(Number(dto.valor) * 100),
      data: data.toISOString(), dataPagamento: data.toISOString(),
      descricao: `${label[tp] || 'Transferência'} (caixa)${dto.descricao ? ' — ' + dto.descricao : ''}`,
      contaId: origemId, contaDestinoId: destinoId,
      origem: 'CRM', externalId: `caixa-mov:${mov.id}`,
      status: 'CONFIRMADO', aplicarRegras: false,
    } as any);
  }

  /** Conta de DINHEIRO (Espécie) do caixa — de onde a despesa em dinheiro sai; fallback 1ª conta ativa. */
  private async contaDinheiro(): Promise<string | null> {
    const din = await this.prisma.contaFinanceira.findFirst({ where: { ativo: true, tipo: 'DINHEIRO' as any }, select: { id: true } });
    if (din) return din.id;
    const qualquer = await this.prisma.contaFinanceira.findFirst({ where: { ativo: true }, orderBy: { createdAt: 'asc' }, select: { id: true } });
    return qualquer?.id ?? null;
  }

  private async despesaCaixaFinanceiro(mov: any, dto: any): Promise<void> {
    const contaId = await this.contaDinheiro();
    if (!contaId) return;
    const data = mov?.data ? new Date(mov.data) : new Date();
    await this.lancamentos.create({
      tipo: 'DESPESA',
      valorCentavos: Math.round(Number(dto.valor) * 100),
      data: data.toISOString(), dataPagamento: data.toISOString(),
      descricao: `Despesa (caixa)${dto.descricao ? ' — ' + dto.descricao : ''}`,
      contaId, categoriaId: dto.categoriaId,
      origem: 'CRM', externalId: `caixa-mov:${mov.id}`,
      status: 'CONFIRMADO', aplicarRegras: false,
    } as any);
  }

  async vendaDireta(dto: any, userId: string) {
    if (!dto?.tutorId) throw new BadRequestException('Cliente obrigatorio');
    if (!dto?.petId) throw new BadRequestException('Pet obrigatorio');

    const itensRaw = Array.isArray(dto.itens) ? dto.itens : [];
    if (itensRaw.length === 0) throw new BadRequestException('Adicione ao menos um item');
    // 🔬 Itens que são EXAME (vindos do catálogo de exames) — vão iniciar o ciclo no Kanban.
    const examItems = itensRaw.filter((it: any) => String(it.tipoItem || '').toUpperCase() === 'EXAME');

    const items = itensRaw.map((it: any) => {
      const quantidade = Number(it.quantidade || 1);
      const valorUnitario = Number(it.valorUnitario || 0);
      const desconto = Number(it.desconto || 0);
      const valorTotal = Math.max(0, quantidade * valorUnitario - desconto);
      // fornecedorId + custoUnitario (custo do lab) seguem pro AppointmentItem → alimentam o a-pagar ao laboratório.
      // convenioId: item faturado ao CONVÊNIO (não ao tutor) → sai do total à vista e vira a-receber mensal.
      return { servicoId: it.servicoId ?? undefined, productId: it.productId ?? undefined, catalogoItemId: it.catalogoItemId ?? undefined, convenioId: it.convenioId ?? undefined, descricao: it.descricao ?? undefined, quantidade, valorUnitario, custoUnitario: it.custoUnitario != null ? Number(it.custoUnitario) : undefined, desconto, valorTotal, executorUserId: it.executorUserId ?? undefined, fornecedorId: it.fornecedorId ?? undefined };
    });
    // Config de vendas: obrigar profissional (vendedor) em cada item
    const cfgVenda = await this.getConfigVendas();
    if (cfgVenda.obrigarProfissionalItem && items.some((it: any) => !it.executorUserId)) {
      throw new BadRequestException('Cada item precisa de um profissional/vendedor (a configuração de vendas exige).');
    }
    // Total do TUTOR = só os itens que NÃO são do convênio (os do convênio viram a-receber mensal).
    const itensTotal = items.reduce((s: number, it: any) => s + (it.convenioId ? 0 : it.valorTotal), 0);
    const descontoGlobal = Number(dto.desconto || 0);
    // 🚫 Trava de desconto POR PERFIL: ADMIN (gerente) não tem limite; os demais respeitam o limite %
    // da config, mas podem exceder com LIBERAÇÃO de um gerente (e-mail + senha de um ADMIN).
    const limitePct = Number(cfgVenda.limiteDesconto) || 0;
    if (limitePct > 0) {
      const operador = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
      const ehGerente = String(operador?.role || '').toUpperCase() === 'ADMIN';
      if (!ehGerente) {
        const bruto = items.reduce((s: number, it: any) => s + (it.convenioId ? 0 : Number(it.quantidade) * Number(it.valorUnitario)), 0);
        const descItens = items.reduce((s: number, it: any) => s + (it.convenioId ? 0 : Number(it.desconto || 0)), 0);
        const pct = bruto > 0 ? ((descItens + descontoGlobal) / bruto) * 100 : 0;
        if (pct > limitePct + 0.01) {
          let liberado = false;
          if (dto.liberacaoEmail && dto.liberacaoSenha) {
            const g = await this.prisma.user.findUnique({ where: { email: String(dto.liberacaoEmail).toLowerCase().trim() }, select: { password: true, role: true } });
            if (g?.password && String(g.role || '').toUpperCase() === 'ADMIN' && await bcrypt.compare(String(dto.liberacaoSenha), g.password)) liberado = true;
          }
          if (!liberado) throw new BadRequestException(`Desconto de ${pct.toFixed(1)}% passa do limite (${limitePct}%). Precisa de liberação de um gerente (e-mail e senha de um admin).`);
        }
      }
    }
    const valorVenda = Math.max(0, Number((itensTotal - descontoGlobal).toFixed(2)));

    const orcamento = String(dto.tipo || 'VENDA').toUpperCase() === 'ORCAMENTO';

    const appointment: any = await this.appointmentsService.create({
      tutorId: dto.tutorId, petId: dto.petId,
      userId: dto.userId || userId,
      date: dto.date || new Date().toISOString(),
      // type/status marcam que é VENDA/ORÇAMENTO (não agendamento) — senão a trava de horário da
      // agenda bloqueia a venda por falso conflito (mesmo padrão da comanda da ficha).
      type: orcamento ? 'Orçamento' : 'Venda', status: 'COMPLETED',
      value: valorVenda, items,
    } as any);

    // 🔬 Exame vendido = inicia o ciclo do exame no Kanban (petexa_) ligado ao pet. Só em VENDA
    // (orçamento vira exame de verdade só quando é convertido). Não quebra a venda se falhar.
    let examesCriados = 0;
    if (!orcamento && examItems.length) {
      examesCriados = await this.examesService.iniciarExamesDaVenda(dto.petId, examItems).catch(() => 0);
    }

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

    return { ok: true, orcamento, appointment, recebimento, valorVenda, valorAplicado, troco, examesCriados };
  }

  async deleteMovimento(caixaId: string, itemId: string) {
    const mov = await this.prisma.caixaMovimento.findUnique({ where: { id: itemId } });
    if (!mov || mov.caixaSessaoId !== caixaId) throw new NotFoundException('Movimento nao encontrado');
    await this.prisma.caixaMovimento.delete({ where: { id: itemId } });
    // remove também o lançamento financeiro da despesa (se houver) — mantém DRE/saldo coerentes
    await this.prisma.lancamento.deleteMany({ where: { origem: 'CRM' as any, externalId: `caixa-mov:${itemId}` } }).catch(() => undefined);
    return { ok: true };
  }

  async deleteRecebimento(caixaId: string, itemId: string) {
    const rec = await this.prisma.recebimento.findUnique({ where: { id: itemId } });
    if (!rec || rec.caixaSessaoId !== caixaId) throw new NotFoundException('Recebimento nao encontrado');
    await this.prisma.creditoMovimento.deleteMany({ where: { recebimentoId: itemId } });
    await this.prisma.recebimento.delete({ where: { id: itemId } });
    // 🧹 Limpa os lançamentos DESTE recebimento no DRE (senão ficam órfãos: taxa de cartão + baixa de crédito).
    await this.prisma.lancamento.deleteMany({ where: { origem: 'CRM' as any, externalId: { startsWith: `taxa:${itemId}:` } } }).catch(() => undefined);
    await this.prisma.lancamento.deleteMany({ where: { origem: 'CRM' as any, externalId: `credito-uso:${itemId}` } }).catch(() => undefined);
    if (rec.appointmentId) {
      const ap = await this.prisma.appointment.findUnique({ where: { id: rec.appointmentId }, include: { recebimentos: true } });
      if (ap) {
        const pago = ap.recebimentos.reduce((s: number, r: any) => s + Number(r.valorTotal), 0);
        await this.prisma.appointment.update({ where: { id: ap.id }, data: { paymentStatus: pago >= Number(ap.value) - 0.001 ? 'PAID' : 'PENDING' } });
        // Se a venda ficou SEM nenhum recebimento, a receita não deve ser reconhecida → remove receita e desconto do DRE.
        if (ap.recebimentos.length === 0) {
          await this.prisma.lancamento.deleteMany({ where: { origem: 'CRM' as any, externalId: { startsWith: `venda:${ap.id}:` } } }).catch(() => undefined);
          await this.prisma.lancamento.deleteMany({ where: { origem: 'CRM' as any, externalId: `desconto:${ap.id}` } }).catch(() => undefined);
        }
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
