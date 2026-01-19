import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFinanceEntryDto } from './dto/create-finance-entry.dto';
import { UpdateFinanceEntryDto } from './dto/update-finance-entry.dto';
import { ListFinanceEntriesQuery } from './dto/list-finance-entries.query';

@Injectable()
export class FinanceService {
  constructor(private readonly prisma: PrismaService) {}

  private buildWhere(userId: string, query: ListFinanceEntriesQuery) {
    const where: any = { userId };

    if (query.status) where.status = query.status as any;
    if (query.type) where.type = query.type as any;

    if (query.from || query.to) {
      where.date = {
        ...(query.from ? { gte: new Date(query.from) } : {}),
        ...(query.to ? { lte: new Date(query.to) } : {}),
      };
    }

    if (query.search) {
      const q = query.search.trim();
      if (q) {
        where.OR = [
          { counterpartyName: { contains: q, mode: 'insensitive' } },
          { service: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
        ];
      }
    }

    return where;
  }

  async create(userId: string, dto: CreateFinanceEntryDto) {
    return this.prisma.financeEntry.create({
      data: {
        userId,
        type: dto.type as any,
        status: (dto.status ?? 'PENDING') as any,
        method: (dto.method ?? 'OTHER') as any,
        counterpartyName: dto.counterpartyName,
        service: dto.service,
        description: dto.description,
        amountCents: dto.amountCents,
        date: dto.date ? new Date(dto.date) : new Date(),
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        paidAt: dto.paidAt ? new Date(dto.paidAt) : null,
      },
    });
  }

  async findAll(userId: string, query: ListFinanceEntriesQuery) {
    const skip = Number.isFinite(query.skip as any) ? (query.skip as number) : 0;
    const take = Number.isFinite(query.take as any) ? (query.take as number) : 50;
    const where = this.buildWhere(userId, query);

    const [items, total] = await Promise.all([
      this.prisma.financeEntry.findMany({
        where,
        orderBy: { date: 'desc' },
        skip,
        take,
      }),
      this.prisma.financeEntry.count({ where }),
    ]);

    return { items, total, skip, take };
  }

  async findById(userId: string, id: string) {
    const entry = await this.prisma.financeEntry.findFirst({
      where: { id, userId },
    });
    if (!entry) throw new NotFoundException('Lançamento não encontrado');
    return entry;
  }

  async update(userId: string, id: string, dto: UpdateFinanceEntryDto) {
    await this.findById(userId, id);
    return this.prisma.financeEntry.update({
      where: { id },
      data: {
        ...(dto.type !== undefined ? { type: dto.type as any } : {}),
        ...(dto.status !== undefined ? { status: dto.status as any } : {}),
        ...(dto.method !== undefined ? { method: dto.method as any } : {}),
        ...(dto.counterpartyName !== undefined ? { counterpartyName: dto.counterpartyName } : {}),
        ...(dto.service !== undefined ? { service: dto.service } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.amountCents !== undefined ? { amountCents: dto.amountCents } : {}),
        ...(dto.date !== undefined ? { date: new Date(dto.date) } : {}),
        ...(dto.dueDate !== undefined ? { dueDate: dto.dueDate ? new Date(dto.dueDate) : null } : {}),
        ...(dto.paidAt !== undefined ? { paidAt: dto.paidAt ? new Date(dto.paidAt) : null } : {}),
      },
    });
  }

  async remove(userId: string, id: string) {
    await this.findById(userId, id);
    await this.prisma.financeEntry.delete({ where: { id } });
    return { message: 'Lançamento removido com sucesso' };
  }

  async summary(userId: string, query: Pick<ListFinanceEntriesQuery, 'from' | 'to'>) {
    const whereBase: any = {
      userId,
      ...(query.from || query.to
        ? {
            date: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {}),
    };

    const [incomeAgg, pendingAgg, countAgg] = await Promise.all([
      this.prisma.financeEntry.aggregate({
        where: { ...whereBase, type: 'INCOME' as any, status: 'PAID' as any },
        _sum: { amountCents: true },
        _count: { _all: true },
      }),
      this.prisma.financeEntry.aggregate({
        where: { ...whereBase, type: 'INCOME' as any, status: { in: ['PENDING', 'OVERDUE'] } as any },
        _sum: { amountCents: true },
        _count: { _all: true },
      }),
      this.prisma.financeEntry.aggregate({
        where: { ...whereBase, type: 'INCOME' as any },
        _sum: { amountCents: true },
        _count: { _all: true },
      }),
    ]);

    const totalIncomeCents = countAgg._sum.amountCents ?? 0;
    const paidIncomeCents = incomeAgg._sum.amountCents ?? 0;
    const pendingIncomeCents = pendingAgg._sum.amountCents ?? 0;
    const totalCount = countAgg._count._all ?? 0;
    const paidCount = incomeAgg._count._all ?? 0;

    const averageTicketCents = totalCount > 0 ? Math.round(totalIncomeCents / totalCount) : 0;
    const paidPercentage = totalCount > 0 ? Math.round((paidCount / totalCount) * 1000) / 10 : 0; // 1 decimal

    return {
      totalIncomeCents,
      paidIncomeCents,
      pendingIncomeCents,
      averageTicketCents,
      paidPercentage,
      totalCount,
      paidCount,
    };
  }
}


