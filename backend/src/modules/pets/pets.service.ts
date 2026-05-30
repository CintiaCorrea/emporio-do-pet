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

  async getStats(id: string) {
    const pet = await this.prisma.pet.findUnique({
      where: { id },
      select: { id: true, name: true, weight: true, createdAt: true, birthDate: true },
    });
    if (!pet) return null;
    const appointments = await this.prisma.appointment.findMany({
      where: { petId: id },
      orderBy: { date: 'desc' },
      select: { id: true, date: true, value: true, status: true, description: true, user: { select: { name: true } } },
      take: 50,
    });
    const total = appointments.length;
    const totalGasto = appointments.reduce((s, a) => s + (a.value || 0), 0);
    const ultimoAtendimento = appointments[0]?.date || null;
    const proximoAgendado = await this.prisma.appointment.findFirst({
      where: { petId: id, date: { gt: new Date() } },
      orderBy: { date: 'asc' },
      select: { id: true, date: true, description: true, user: { select: { name: true } } },
    });
    // Atendimentos por mês (últimos 6)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const recent = appointments.filter(a => new Date(a.date) >= sixMonthsAgo);
    const monthly: Record<string, number> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthly[key] = 0;
    }
    for (const a of recent) {
      const d = new Date(a.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (key in monthly) monthly[key]++;
    }
    return {
      pet: { id: pet.id, name: pet.name, weight: pet.weight, birthDate: pet.birthDate },
      total,
      totalGasto: +totalGasto.toFixed(2),
      ultimoAtendimento,
      proximoAgendado,
      mensal: Object.entries(monthly).map(([k, v]) => ({ mes: k, qtd: v })),
      timeline: appointments.slice(0, 10).map(a => ({
        id: a.id, date: a.date, value: a.value, status: a.status,
        description: a.description, profissional: a.user?.name,
      })),
    };
  }
}