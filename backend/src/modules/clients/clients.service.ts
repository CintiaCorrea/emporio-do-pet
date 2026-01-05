import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(params?: { page?: number; limit?: number; skip?: number; take?: number; search?: string }) {
    const { page = 1, limit = 10, skip, take, search } = params || {};
    const resolvedTake = Number.isFinite(take as any) ? (take as number) : limit;
    const resolvedSkip =
      Number.isFinite(skip as any) ? (skip as number) : Math.max(0, (page - 1) * resolvedTake);

    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
            { phone: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

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
          _count: { select: { recipients: true } },
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
        _count: { select: { recipients: true } },
      },
    });

    if (!client) throw new NotFoundException('Client não encontrado');
    return client;
  }

  async create(dto: CreateClientDto) {
    const existing = await this.prisma.client.findUnique({ where: { email: dto.email } });
    if (existing) throw new BadRequestException('Email já cadastrado');

    return this.prisma.client.create({
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        address: dto.address,
      },
      include: { _count: { select: { recipients: true } } },
    });
  }

  async update(id: string, dto: UpdateClientDto) {
    const existing = await this.prisma.client.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Client não encontrado');

    if (dto.email && dto.email !== existing.email) {
      const emailInUse = await this.prisma.client.findUnique({ where: { email: dto.email } });
      if (emailInUse) throw new BadRequestException('Email já cadastrado para outro client');
    }

    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.phone !== undefined) data.phone = dto.phone;
    if (dto.address !== undefined) data.address = dto.address;

    return this.prisma.client.update({
      where: { id },
      data,
      include: { _count: { select: { recipients: true } } },
    });
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
}


