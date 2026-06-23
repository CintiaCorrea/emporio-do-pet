import { Injectable, NotFoundException } from '@nestjs/common';
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
      },
    });
    if (!c) throw new NotFoundException('Caixa nao encontrado');
    return c;
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

  async fechar(id: string) {
    return this.prisma.caixaSessao.update({
      where: { id },
      data: { status: 'FECHADO', fechamento: new Date() },
    });
  }

  async registrarRecebimento(caixaId: string, dto: any, userId: string) {
    const rec = await this.prisma.recebimento.create({
      data: {
        caixaSessaoId: caixaId,
        appointmentId: dto.appointmentId || null,
        valorTotal: Number(dto.valorTotal || 0),
        desconto: Number(dto.desconto || 0),
        troco: Number(dto.troco || 0),
        formas: dto.formas ?? [],
        observacao: dto.observacao || null,
        createdById: userId,
      },
    });
    if (dto.appointmentId) {
      const ap = await this.prisma.appointment.findUnique({
        where: { id: dto.appointmentId },
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
}
