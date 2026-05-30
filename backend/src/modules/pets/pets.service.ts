import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsService } from '../events/events.service';
import { CreatePetDto } from './dto/create-pet.dto';
import { UpdatePetDto } from './dto/update-pet.dto';

@Injectable()
export class PetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsService: EventsService,
  ) {}

  async create(createPetDto: CreatePetDto) {
    const pet = await this.prisma.pet.create({
      data: createPetDto,
      include: {
        tutor: true,
      },
    });

    // Emit pet created event (find userId from tutor's appointments or skip)
    try {
      this.eventsService.emitPetCreated('system', {
        petId: pet.id,
        name: pet.name,
        species: pet.species || undefined,
        tutorId: pet.tutorId,
        tutorName: (pet as any).tutor?.name,
      });
    } catch {}

    return pet;
  }

  async findAll(params?: {
    tutorId?: string;
    search?: string;
    species?: string;
    status?: string;
    page?: number;
    limit?: number;
    skip?: number;
    take?: number;
  }) {
    const { tutorId, search, species, status, page = 1, limit = 10, skip, take } = params || {};

    const resolvedTake = Number.isFinite(take as any) ? (take as number) : limit;
    const resolvedSkip = Number.isFinite(skip as any)
      ? (skip as number)
      : Math.max(0, (page - 1) * resolvedTake);

    const where: any = {};
    if (tutorId) where.tutorId = tutorId;
    if (species) where.species = species;
    if (status) where.status = status;

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' as const } },
        { breed: { contains: search, mode: 'insensitive' as const } },
        { microchip: { contains: search, mode: 'insensitive' as const } },
        { tutor: { name: { contains: search, mode: 'insensitive' as const } } },
      ];
    }

    const [pets, total] = await Promise.all([
      this.prisma.pet.findMany({
        where,
        include: {
          tutor: {
            select: {
              id: true,
              name: true,
              cpf: true,
              contacts: { where: { isPrimary: true }, take: 1 },
            },
          },
          appointments: {
            orderBy: { date: 'desc' as const },
            take: 1,
            select: { id: true, date: true, status: true },
          },
          _count: { select: { appointments: true, treatments: true } },
        },
        orderBy: { createdAt: 'desc' as const },
        skip: resolvedSkip,
        take: resolvedTake,
      }),
      this.prisma.pet.count({ where }),
    ]);

    return {
      pets,
      pagination: {
        page,
        limit: resolvedTake,
        total,
        pages: Math.ceil(total / resolvedTake),
      },
    };
  }

  async findById(id: string) {
    const pet = await this.prisma.pet.findUnique({
      where: { id },
      include: {
        tutor: {
          include: {
            contacts: true,
          },
        },
        appointments: {
          take: 10,
          orderBy: { date: 'desc' },
          include: {
            user: { select: { id: true, name: true } },
          },
        },
        treatments: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!pet) {
      throw new NotFoundException('Pet não encontrado');
    }

    return pet;
  }

  async update(id: string, updatePetDto: UpdatePetDto) {
    await this.findById(id);

    return this.prisma.pet.update({
      where: { id },
      data: updatePetDto,
      include: {
        tutor: true,
      },
    });
  }

  async remove(id: string) {
    await this.findById(id);

    return this.prisma.pet.delete({
      where: { id },
    });
  }

  async profileStats(petId: string) {
    const pet = await this.prisma.pet.findUnique({ where: { id: petId }, include: { tutor: true } });
    if (!pet) throw new NotFoundException('Pet não encontrado');

    const now = new Date();
    const [appointments, todayCount, futuras] = await Promise.all([
      this.prisma.appointment.findMany({
        where: { petId },
        select: { id: true, date: true, value: true, status: true, paymentStatus: true, description: true },
        orderBy: { date: 'desc' },
      }),
      this.prisma.appointment.count({ where: { petId, status: { not: 'CANCELLED' } } }),
      this.prisma.appointment.findMany({
        where: { petId, date: { gte: now }, status: { not: 'CANCELLED' } },
        orderBy: { date: 'asc' }, take: 1,
        select: { id: true, date: true, description: true },
      }),
    ]);
    const realizadas = appointments.filter(a => a.status === 'COMPLETED' || a.status === 'DONE' || a.date < now);
    const ultima = realizadas[0];
    const proxima = futuras[0];
    const diasDesdeUltima = ultima ? Math.floor((now.getTime() - new Date(ultima.date).getTime()) / 86400000) : null;
    const diasAteProxima = proxima ? Math.floor((new Date(proxima.date).getTime() - now.getTime()) / 86400000) : null;
    const valorTotal = realizadas.reduce((s, a) => s + (a.value || 0), 0);
    const valorPago = realizadas.filter(a => a.paymentStatus === 'PAID').reduce((s, a) => s + (a.value || 0), 0);

    // Frequência mensal últimos 12 meses
    const freq: { mes: string; total: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const next = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const total = realizadas.filter(a => {
        const ad = new Date(a.date);
        return ad >= d && ad < next;
      }).length;
      freq.push({ mes: d.toLocaleDateString('pt-BR', { month: 'short' }), total });
    }

    let idadeAnos: number | null = null;
    let idadeMeses: number | null = null;
    if (pet.birthDate) {
      const ms = now.getTime() - new Date(pet.birthDate).getTime();
      const totalMeses = Math.floor(ms / (1000 * 60 * 60 * 24 * 30));
      idadeAnos = Math.floor(totalMeses / 12);
      idadeMeses = totalMeses % 12;
    }

    // Timeline simplificada (últimos 10 atendimentos)
    const timeline = realizadas.slice(0, 10).map(a => ({
      id: a.id, data: a.date, descricao: a.description, valor: a.value, paymentStatus: a.paymentStatus,
    }));

    return {
      totalConsultas: todayCount,
      realizadas: realizadas.length,
      futurasAgendadas: futuras.length > 0 ? 1 : 0,
      diasDesdeUltima,
      ultima: ultima ? { id: ultima.id, data: ultima.date, descricao: ultima.description } : null,
      proxima: proxima ? { id: proxima.id, data: proxima.date, descricao: proxima.description } : null,
      diasAteProxima,
      valorTotal: +valorTotal.toFixed(2),
      valorPago: +valorPago.toFixed(2),
      ticketMedio: realizadas.length > 0 ? +(valorTotal / realizadas.length).toFixed(2) : 0,
      idadeAnos, idadeMeses,
      pesoAtual: pet.weight,
      frequenciaMensal: freq,
      timeline,
    };
  }
}