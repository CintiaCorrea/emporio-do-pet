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

  /**
   * Recarga de crédito = ADIANTAMENTO (não é receita). Entra dinheiro agora, mas só vira receita quando
   * o cliente USA o crédito numa venda (lá é feita a baixa do adiantamento — recebimentos.processar).
   * RECARGA → RECEITA "Adiantamento de Clientes" (fora da Receita Bruta). ESTORNO → DESPESA "(baixa)".
   */
  private async lancarAdiantamento(mov: any, tipo: string): Promise<void> {
    const contaId = await this.contaDinheiroId();
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
      where: { value: { gt: 0 }, paymentStatus: { not: 'PAID' } },
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
    // 💳 Reflete no financeiro como ADIANTAMENTO (fire-and-forget, não trava a recarga).
    if (tipo === 'RECARGA' || tipo === 'ESTORNO') this.lancarAdiantamento(mov, tipo).catch(() => undefined);
    return { mov, saldo: await this.saldo(tutorId) };
  }
}
