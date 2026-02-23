import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { ClientStatus } from '@prisma/client';

@Injectable()
export class ClientsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async findAll(params?: {
    page?: number;
    limit?: number;
    skip?: number;
    take?: number;
    search?: string;
    status?: ClientStatus;
    type?: 'INDIVIDUAL' | 'COMPANY';
    tags?: string[];
    fromLead?: boolean;
  }) {
    const { page = 1, limit = 10, skip, take, search, status, type, tags, fromLead } = params || {};
    const resolvedTake = Number.isFinite(take as any) ? (take as number) : limit;
    const resolvedSkip = Number.isFinite(skip as any)
      ? (skip as number)
      : Math.max(0, (page - 1) * resolvedTake);

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' as const } },
        { email: { contains: search, mode: 'insensitive' as const } },
        { phone: { contains: search, mode: 'insensitive' as const } },
        { companyName: { contains: search, mode: 'insensitive' as const } },
      ];
    }

    if (status) where.status = status;
    if (type) where.type = type;
    if (tags?.length) where.tags = { hasSome: tags };
    if (fromLead !== undefined) {
      where.convertedFromLeadId = fromLead ? { not: null } : null;
    }

    const [clients, total] = await Promise.all([
      this.prisma.client.findMany({
        where,
        include: {
          recipients: {
            include: {
              newsletter: {
                select: { id: true, title: true, status: true },
              },
            },
            orderBy: { createdAt: 'desc' as const },
            take: 5,
          },
          kanbanCards: {
            include: {
              column: { select: { id: true, name: true, color: true } },
            },
            take: 1,
          },
          _count: { select: { recipients: true, kanbanCards: true } },
        },
        orderBy: { createdAt: 'desc' as const },
        skip: resolvedSkip,
        take: resolvedTake,
      }),
      this.prisma.client.count({ where }),
    ]);

    return {
      clients,
      pagination: {
        page,
        limit: resolvedTake,
        total,
        pages: Math.ceil(total / resolvedTake),
      },
    };
  }

  async findById(id: string) {
    const client = await this.prisma.client.findUnique({
      where: { id },
      include: {
        recipients: {
          include: {
            newsletter: {
              select: {
                id: true,
                title: true,
                subject: true,
                status: true,
                scheduledFor: true,
                sentAt: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' as const },
        },
        kanbanCards: {
          include: {
            column: {
              select: { id: true, name: true, color: true },
              include: {
                board: { select: { id: true, name: true, type: true } },
              },
            },
          },
        },
        _count: { select: { recipients: true, kanbanCards: true } },
      },
    });

    if (!client) throw new NotFoundException('Client não encontrado');
    return client;
  }

  async findByEmail(email: string) {
    return this.prisma.client.findUnique({
      where: { email },
      include: {
        _count: { select: { recipients: true, kanbanCards: true } },
      },
    });
  }

  async findByLeadId(leadId: string) {
    return this.prisma.client.findFirst({
      where: { convertedFromLeadId: leadId },
      include: {
        _count: { select: { recipients: true, kanbanCards: true } },
      },
    });
  }

  async create(dto: CreateClientDto) {
    const existing = await this.prisma.client.findUnique({ where: { email: dto.email } });
    if (existing) throw new BadRequestException('Email já cadastrado');

    const client = await this.prisma.client.create({
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        address: dto.address,
        status: (dto as any).status || 'ACTIVE',
        type: (dto as any).type || 'INDIVIDUAL',
        companyName: (dto as any).companyName,
        taxId: (dto as any).taxId,
        website: (dto as any).website,
        notes: (dto as any).notes,
        tags: (dto as any).tags || [],
        convertedFromLeadId: (dto as any).convertedFromLeadId,
      },
      include: { _count: { select: { recipients: true } } },
    });

    // Emit event for automations
    this.eventEmitter.emit('crm.client.created', {
      clientId: client.id,
      convertedFromLeadId: (dto as any).convertedFromLeadId,
    });

    return client;
  }

  async update(id: string, dto: UpdateClientDto) {
    const existing = await this.prisma.client.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Client não encontrado');

    if (dto.email && dto.email !== existing.email) {
      const emailInUse = await this.prisma.client.findUnique({ where: { email: dto.email } });
      if (emailInUse) throw new BadRequestException('Email já cadastrado para outro client');
    }

    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.phone !== undefined) data.phone = dto.phone;
    if (dto.address !== undefined) data.address = dto.address;
    if ((dto as any).status !== undefined) data.status = (dto as any).status;
    if ((dto as any).type !== undefined) data.type = (dto as any).type;
    if ((dto as any).companyName !== undefined) data.companyName = (dto as any).companyName;
    if ((dto as any).taxId !== undefined) data.taxId = (dto as any).taxId;
    if ((dto as any).website !== undefined) data.website = (dto as any).website;
    if ((dto as any).notes !== undefined) data.notes = (dto as any).notes;
    if ((dto as any).tags !== undefined) data.tags = (dto as any).tags;

    const previousStatus = existing.status;
    const client = await this.prisma.client.update({
      where: { id },
      data,
      include: { _count: { select: { recipients: true } } },
    });

    // Emit status change event if status changed
    if (data.status && data.status !== previousStatus) {
      this.eventEmitter.emit('crm.client.status_changed', {
        clientId: client.id,
        previousStatus,
        newStatus: data.status,
      });
    }

    return client;
  }

  async remove(id: string) {
    const existing = await this.prisma.client.findUnique({
      where: { id },
      include: { _count: { select: { recipients: true } } },
    });
    if (!existing) throw new NotFoundException('Client não encontrado');

    if (existing._count.recipients > 0) {
      throw new BadRequestException('Não é possível excluir client com recipients vinculados');
    }

    await this.prisma.client.delete({ where: { id } });
    return { message: 'Client excluído com sucesso' };
  }

  async updateStatus(id: string, status: ClientStatus) {
    const existing = await this.prisma.client.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Client não encontrado');

    const previousStatus = existing.status;
    const client = await this.prisma.client.update({
      where: { id },
      data: { status },
    });

    if (status !== previousStatus) {
      this.eventEmitter.emit('crm.client.status_changed', {
        clientId: client.id,
        previousStatus,
        newStatus: status,
      });
    }

    return client;
  }

  async addTags(id: string, tags: string[]) {
    const existing = await this.prisma.client.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Client não encontrado');

    const newTags = [...new Set([...existing.tags, ...tags])];
    return this.prisma.client.update({
      where: { id },
      data: { tags: newTags },
    });
  }

  async removeTags(id: string, tags: string[]) {
    const existing = await this.prisma.client.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Client não encontrado');

    const newTags = existing.tags.filter((t) => !tags.includes(t));
    return this.prisma.client.update({
      where: { id },
      data: { tags: newTags },
    });
  }

  async recordPurchase(id: string, amountCents: number) {
    const existing = await this.prisma.client.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Client não encontrado');

    return this.prisma.client.update({
      where: { id },
      data: {
        totalRevenue: { increment: amountCents },
        totalOrders: { increment: 1 },
        lastOrderAt: new Date(),
      },
    });
  }

  async getStats() {
    const [
      totalClients,
      activeClients,
      inactiveClients,
      companies,
      individuals,
      fromLeads,
      totalRevenue,
      avgRevenue,
    ] = await Promise.all([
      this.prisma.client.count(),
      this.prisma.client.count({ where: { status: 'ACTIVE' } }),
      this.prisma.client.count({ where: { status: { in: ['INACTIVE', 'CHURNED'] } } }),
      this.prisma.client.count({ where: { type: 'COMPANY' } }),
      this.prisma.client.count({ where: { type: 'INDIVIDUAL' } }),
      this.prisma.client.count({ where: { convertedFromLeadId: { not: null } } }),
      this.prisma.client.aggregate({ _sum: { totalRevenue: true } }),
      this.prisma.client.aggregate({ _avg: { totalRevenue: true } }),
    ]);

    return {
      total: totalClients,
      active: activeClients,
      inactive: inactiveClients,
      companies,
      individuals,
      fromLeads,
      conversionRate: totalClients > 0 ? ((fromLeads / totalClients) * 100).toFixed(1) : '0',
      totalRevenue: totalRevenue._sum.totalRevenue || 0,
      averageRevenue: Math.round(avgRevenue._avg.totalRevenue || 0),
    };
  }
}
