import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

function dayRange(dateStr?: string) {
  const d = dateStr ? new Date(dateStr + 'T00:00:00') : new Date();
  const ini = new Date(d); ini.setHours(0, 0, 0, 0);
  const fim = new Date(d); fim.setHours(23, 59, 59, 999);
  return { ini, fim };
}

@Injectable()
export class CaixaService {
  constructor(private readonly prisma: PrismaService) {}

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
        status: 'FECHADO',
        fechamento: new Date(),
        valorEsperado,
        valorContado,
        diferenca,
        obsFechamento: dto.observacao || null,
      },
    });
  }

  async reabrir(id: string) {
    return this.prisma.caixaSessao.update({
      where: { id },
      data: { status: 'ABERTO', fechamento: null },
    });
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
        caixaSessaoId: caixaId,
        appointmentId,
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
      const ap = await this.prisma.appointment.findUnique({
        where: { id: appointmentId },
        include: { recebimentos: true },
      });
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
}
