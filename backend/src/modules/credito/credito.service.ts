import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CreditoService {
  constructor(private readonly prisma: PrismaService) {}

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
    return { mov, saldo: await this.saldo(tutorId) };
  }
}
