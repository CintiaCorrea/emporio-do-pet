import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LancamentosService } from '../financeiro/lancamentos.service';
import { classificarSaldo, realizadaAReceber } from './credito.regras';

@Injectable()
export class CreditoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly lancamentos: LancamentosService,
  ) {}

  private async contaDinheiroId(): Promise<string | null> {
    const din = await this.prisma.contaFinanceira.findFirst({ where: { ativo: true, tipo: 'DINHEIRO' as any }, select: { id: true } });
    if (din) return din.id;
    const q = await this.prisma.contaFinanceira.findFirst({ where: { ativo: true }, orderBy: { createdAt: 'asc' }, select: { id: true } });
    return q?.id ?? null;
  }
  private norm(s?: string): string { return String(s || '').trim().toLowerCase(); }
  // Config da forma de recebimento (mesma fonte do PDV/recebimentos): nome → {tipo, contaId, adquirente, taxas}.
  private async formaCfg(nome?: string): Promise<any | null> {
    if (!nome) return null;
    const itens = await this.prisma.listaItem.findMany({ where: { lista: 'formasrecebimento' } });
    for (const it of itens) { try { const c = JSON.parse(it.valor); if (this.norm(c.nome) === this.norm(nome)) return c; } catch { /* ignore */ } }
    return null;
  }
  private taxaFormaDe(modalidade?: string): string | null {
    const m = this.norm(modalidade);
    if (m.includes('parcel')) return 'credito parcelado';
    if (m.includes('cr')) return 'credito a vista';
    if (m.includes('d')) return 'debito';
    return null;
  }
  // Taxa EXATA (bps) da maquininha por adquirente|bandeira|forma|parcelas (TaxaContratada).
  private async taxaBps(adquirente?: string, bandeira?: string, modalidade?: string, parcelas?: number): Promise<number | null> {
    const tForma = this.taxaFormaDe(modalidade); if (!tForma || !bandeira) return null;
    const parc = tForma === 'credito parcelado' ? (Number(parcelas) || 1) : 1;
    const row = await this.prisma.taxaContratada.findFirst({ where: { adquirente: { equals: adquirente || '', mode: 'insensitive' }, bandeira: { equals: bandeira, mode: 'insensitive' }, forma: { equals: tForma, mode: 'insensitive' }, parcelas: parc }, select: { aliquotaBps: true } });
    return row ? Number(row.aliquotaBps) : null;
  }

  /**
   * Recarga de crédito = ADIANTAMENTO (não é receita). Entra dinheiro agora, mas só vira receita quando
   * o cliente USA o crédito numa venda (lá é feita a baixa do adiantamento — recebimentos.processar).
   * RECARGA → RECEITA "Adiantamento de Clientes" (fora da Receita Bruta). ESTORNO → DESPESA "(baixa)".
   */
  private async lancarAdiantamento(mov: any, tipo: string, opts?: { contaId?: string | null; nsu?: string | null }): Promise<void> {
    const contaId = opts?.contaId || await this.contaDinheiroId();
    if (!contaId) return;
    const ehRecarga = tipo === 'RECARGA';
    const cat = await this.prisma.categoria.findFirst({
      where: ehRecarga
        ? ({ tipo: 'RECEITA', natureza: 'NAO_OPERACIONAL', nome: { contains: 'Adiantamento' } } as any)
        : ({ tipo: 'DESPESA', nome: { contains: 'Adiantamento' } } as any),
      select: { id: true },
    });
    if (!cat) return;
    const data = mov?.data ? new Date(mov.data) : new Date();
    await this.lancamentos.create({
      tipo: ehRecarga ? 'RECEITA' : 'DESPESA',
      valorCentavos: Math.round(Number(mov.valor) * 100),
      data: data.toISOString(), dataPagamento: data.toISOString(),
      descricao: `${ehRecarga ? 'Recarga de crédito' : 'Estorno de crédito'} — adiantamento`,
      contaId, categoriaId: cat.id,
      ...(opts?.nsu ? { numeroDocumento: String(opts.nsu) } : {}),
      origem: 'CRM', externalId: `credito-mov:${mov.id}`,
      status: 'CONFIRMADO', aplicarRegras: false,
    } as any);
  }

  static saldoFrom(movs: { tipo: string; valor: number }[]) {
    return movs.reduce((s, m) => s + (m.tipo === 'USO' ? -Number(m.valor) : Number(m.valor)), 0);
  }

  async saldo(tutorId: string) {
    const movs = await this.prisma.creditoMovimento.findMany({ where: { tutorId } });
    return CreditoService.saldoFrom(movs as any);
  }

  async extrato(tutorId: string) {
    const movimentos = await this.prisma.creditoMovimento.findMany({
      where: { tutorId }, orderBy: { data: 'desc' }, take: 100,
    });
    return { saldo: CreditoService.saldoFrom(movimentos as any), movimentos };
  }

  // Resumo p/ o cabeçalho do "Registrar recebimento": crédito/caução do cliente + total a receber
  // (todas as vendas dele em aberto, exceto internação). Mesma regra do listSaldos.
  async resumoTutor(tutorId: string) {
    const credito = await this.saldo(tutorId);
    const now = new Date();
    const aps = await this.prisma.appointment.findMany({
      where: { tutorId, value: { gt: 0 }, paymentStatus: { not: 'PAID' }, NOT: { notes: { contains: 'HOSPITALIZATION' } } },
      select: { value: true, status: true, date: true },
    });
    let aReceber = 0;
    for (const a of aps) if (realizadaAReceber(a.status, a.date, now)) aReceber += Number(a.value) || 0;
    return { credito: Number(credito) || 0, aReceber };
  }

  // Saldo consolidado por cliente (tutor): CRÉDITO de loja (+) menos CONTAS A RECEBER (−).
  // Assim a tela "Saldo dos clientes" mostra CREDORES (têm crédito) e DEVEDORES (devem, ex.:
  // saldos em aberto migrados do SimplesVet) na MESMA lista. Retorna só quem tem saldo != 0.
  async listSaldos() {
    // (1) crédito de loja (CreditoMovimento)
    const movs = await this.prisma.creditoMovimento.findMany({ select: { tutorId: true, tipo: true, valor: true } });
    const credito = new Map<string, number>();
    for (const m of movs) {
      if (!m.tutorId) continue;
      credito.set(m.tutorId, (credito.get(m.tutorId) || 0) + (m.tipo === 'USO' ? -Number(m.valor) : Number(m.valor)));
    }
    // (2) contas A RECEBER = atendimentos realizados NÃO pagos (o cliente DEVE) — mesma regra do "A receber" da ficha.
    const now = new Date();
    const aps = await this.prisma.appointment.findMany({
      // Exclui a INTERNAÇÃO (value = diária) — quem gera o a-receber dela são as comandas diárias (venda),
      // senão a internação contava 2× no "Saldo dos clientes".
      where: { value: { gt: 0 }, paymentStatus: { not: 'PAID' }, NOT: { notes: { contains: 'HOSPITALIZATION' } } },
      select: { tutorId: true, value: true, status: true, date: true },
    });
    const receber = new Map<string, number>();
    for (const a of aps) {
      if (!a.tutorId) continue;
      if (!realizadaAReceber(a.status, a.date, now)) continue;
      receber.set(a.tutorId, (receber.get(a.tutorId) || 0) + (Number(a.value) || 0));
    }
    // (3) saldo líquido = crédito − a receber
    const tutorIds = Array.from(new Set<string>([...credito.keys(), ...receber.keys()]));
    const tutors = tutorIds.length
      ? await this.prisma.tutor.findMany({ where: { id: { in: tutorIds } }, select: { id: true, name: true } })
      : [];
    const tmap = new Map(tutors.map((t) => [t.id, t.name]));
    const compras = tutorIds.length
      ? await this.prisma.appointment.groupBy({ by: ['tutorId'], where: { tutorId: { in: tutorIds }, value: { gt: 0 } }, _max: { date: true } })
      : [];
    const cmap = new Map<string, Date>();
    for (const c of compras) if (c.tutorId && c._max.date) cmap.set(c.tutorId, c._max.date as Date);
    return tutorIds
      .map((id) => {
        const { saldo, situacao } = classificarSaldo(credito.get(id) || 0, receber.get(id) || 0);
        return { tutorId: id, nome: tmap.get(id) || 'Cliente', saldo, situacao, ultimaCompra: cmap.get(id) || null };
      })
      .filter((x) => Math.abs(x.saldo) > 0.001)
      .sort((a, b) => b.saldo - a.saldo);
  }

  async adicionar(dto: any, userId: string) {
    const tipo = String(dto.tipo || 'RECARGA').toUpperCase();
    if (!['RECARGA', 'ESTORNO'].includes(tipo)) throw new BadRequestException('Tipo de credito invalido');
    const valor = Number(dto.valor || 0);
    if (valor <= 0) throw new BadRequestException('Valor invalido');
    let tutorId = dto.tutorId || null;
    if (!tutorId && dto.appointmentId) {
      const ap = await this.prisma.appointment.findUnique({ where: { id: dto.appointmentId }, select: { tutorId: true } });
      tutorId = ap?.tutorId || null;
    }
    if (!tutorId) throw new BadRequestException('Cliente nao informado');
    const mov = await this.prisma.creditoMovimento.create({
      data: {
        tutorId, tipo, valor,
        descricao: dto.descricao || null,
        caixaSessaoId: dto.caixaSessaoId || null,
        appointmentId: dto.appointmentId || null,
        createdById: userId,
      },
    });
    // Forma como numa VENDA: aceita `formasStr` (texto, blindado), `formas` (array) ou `forma` (string).
    let formasIn: any = dto.formas;
    if (dto.formasStr) { try { formasIn = JSON.parse(dto.formasStr); } catch { /* usa dto.formas */ } }
    const formasArr = (Array.isArray(formasIn) && formasIn.length) ? formasIn : [{ forma: dto.forma || 'Dinheiro', valor }];
    const f0: any = formasArr[0] || { forma: 'Dinheiro' };
    const cfg = await this.formaCfg(f0.forma);
    const contaForma = cfg?.contaId || null; // conta ligada à forma (cartão/pix vão pra conta certa, não "Dinheiro")
    const ehDinheiro = /dinheiro|esp[eé]cie/i.test(this.norm(f0.forma)) || !cfg || /dinheiro/i.test(this.norm(cfg?.tipo || ''));

    // 💳 ADIANTAMENTO no financeiro — agora na CONTA DA FORMA (não sempre dinheiro) + NSU p/ conciliação.
    if (tipo === 'RECARGA' || tipo === 'ESTORNO') this.lancarAdiantamento(mov, tipo, { contaId: contaForma, nsu: f0.nsu }).catch(() => undefined);

    if (tipo === 'RECARGA' && dto.caixaSessaoId) {
      try {
        const sess = await this.prisma.caixaSessao.findUnique({ where: { id: dto.caixaSessaoId }, select: { abertura: true } });
        if (sess) {
          // SUPRIMENTO com a FORMA escolhida. Só conta na "gaveta de dinheiro" se a forma for dinheiro
          // (o front já filtra por ehDinheiro); cartão/pix aparecem no Resumo na coluna da forma.
          await this.prisma.caixaMovimento.create({
            data: {
              caixaSessaoId: dto.caixaSessaoId, tipo: 'SUPRIMENTO', valor,
              forma: f0.forma || 'Dinheiro',
              descricao: `Crédito do pet${dto.descricao ? ' — ' + dto.descricao : ''}`,
              observacao: `credito:${mov.id}`, // link p/ reverter o crédito+DRE se este movimento for excluído
              data: sess.abertura, createdById: userId,
            },
          });
          // 💰 TAXA da maquininha (se cartão) → DESPESA, igual à venda. Desconta do que a clínica recebe.
          if (!ehDinheiro && cfg && /cart|maquin|cr[eé]dit|d[eé]bit/i.test(this.norm(cfg.tipo || ''))) {
            try {
              const bps = await this.taxaBps(cfg.adquirente || f0.forma, f0.bandeira, f0.modalidade, f0.parcelas);
              const feeCent = bps ? Math.round(valor * (bps / 10000) * 100) : 0;
              if (feeCent > 0) {
                const catTax = await this.prisma.categoria.findFirst({ where: { tipo: 'DESPESA' as any, nome: { contains: 'Dedu' } }, select: { id: true } });
                if (catTax) await this.lancamentos.create({
                  tipo: 'DESPESA' as any, valorCentavos: feeCent,
                  data: sess.abertura.toISOString(), dataPagamento: sess.abertura.toISOString(),
                  descricao: `Taxa ${f0.forma}`, contaId: contaForma || undefined, categoriaId: catTax.id,
                  origem: 'CRM', externalId: `credito-taxa:${mov.id}`, status: 'CONFIRMADO', aplicarRegras: false,
                } as any);
              }
            } catch (e: any) { console.error('crédito taxa:', e?.message); }
          }
        }
      } catch (e: any) { console.error('crédito → caixaMovimento:', e?.message); }
    }
    return { mov, saldo: await this.saldo(tutorId) };
  }
}
