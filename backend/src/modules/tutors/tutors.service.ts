import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { EventsService } from '../events/events.service';
import { TutorStatus } from '@prisma/client';
import { CreateTutorDto } from './dto/create-tutor.dto';
import { UpdateTutorDto } from './dto/update-tutor.dto';

@Injectable()
export class TutorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsService: EventsService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(createTutorDto: CreateTutorDto) {
    const { contacts, ...tutorData } = createTutorDto as any;

    const contactCreates = Array.isArray(contacts)
      ? contacts
          .filter((c: any) => typeof c?.number === 'string' && c.number.trim().length > 0)
          .map((c: any) => ({
            type: c.type,
            number: c.number.trim(),
            isWhatsApp: c.isWhatsApp ?? false,
            observations: c.observations || undefined,
            isPrimary: c.isPrimary ?? false,
          }))
      : [];

    if (contactCreates.length === 0) {
      throw new BadRequestException('Pelo menos um contato com número é necessário');
    }

    // Garantir que exista exatamente 1 contato primário
    const firstPrimaryIndex = contactCreates.findIndex((c) => c.isPrimary === true);
    if (firstPrimaryIndex === -1) {
      contactCreates[0].isPrimary = true;
    } else {
      contactCreates.forEach((c, idx) => {
        c.isPrimary = idx === firstPrimaryIndex;
      });
    }

    const tutor = await this.prisma.tutor.create({
      data: {
        ...tutorData,
        contacts: {
          create: contactCreates,
        },
      },
      include: {
        contacts: true,
        pets: true,
      },
    });

    // Emit tutor created event for automations
    // Note: userId would need to be passed from controller if multi-tenant
    const primaryContact = tutor.contacts.find((c: { isPrimary: boolean }) => c.isPrimary);
    this.eventsService.emitTutorCreated('system', {
      tutorId: tutor.id,
      name: tutor.name,
      email: tutor.email || undefined,
      phone: primaryContact?.number,
    });

    return tutor;
  }

  async findAll(params?: { search?: string; skip?: number; take?: number }) {
    const { search, skip = 0, take = 20 } = params || {};

    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
            { cpf: { contains: search } },
          ],
        }
      : {};

    const [tutors, total] = await Promise.all([
      this.prisma.tutor.findMany({
        where,
        skip,
        take,
        include: {
          contacts: true,
          pets: true,
          _count: {
            select: { appointments: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.tutor.count({ where }),
    ]);

    return { tutors, total, skip, take };
  }

  async findById(id: string) {
    const tutor = await this.prisma.tutor.findUnique({
      where: { id },
      include: {
        contacts: true,
        pets: {
          include: {
            appointments: {
              take: 5,
              orderBy: { date: 'desc' },
            },
          },
        },
        appointments: {
          take: 10,
          orderBy: { date: 'desc' },
          include: {
            pet: true,
            user: {
              select: { id: true, name: true },
            },
          },
        },
        _count: {
          select: {
            pets: true,
            contacts: true,
            appointments: true,
          },
        },
      },
    });

    if (!tutor) {
      throw new NotFoundException('Tutor não encontrado');
    }

    return tutor;
  }

  async update(id: string, updateTutorDto: UpdateTutorDto) {
    await this.findById(id);

    return this.prisma.tutor.update({
      where: { id },
      data: updateTutorDto,
      include: {
        contacts: true,
        pets: true,
      },
    });
  }

  async remove(id: string) {
    await this.findById(id);

    return this.prisma.tutor.delete({
      where: { id },
    });
  }

  // ============================================
  // Endpoints comerciais (portados de clients.service.ts)
  // Tutor.classificacao = 'Cliente' representa o antigo Client.
  // ============================================

  async getStats() {
    const [
      total,
      active,
      inactive,
      companies,
      individuals,
      fromLeads,
    ] = await Promise.all([
      this.prisma.tutor.count({ where: { classificacao: 'Cliente' } }),
      this.prisma.tutor.count({ where: { classificacao: 'Cliente', status: 'ACTIVE' } }),
      this.prisma.tutor.count({
        where: { classificacao: 'Cliente', status: { in: ['INACTIVE', 'CHURNED'] } },
      }),
      this.prisma.tutor.count({ where: { classificacao: 'Cliente', type: 'LEGAL_ENTITY' } }),
      this.prisma.tutor.count({ where: { classificacao: 'Cliente', type: 'INDIVIDUAL' } }),
      this.prisma.tutor.count({
        where: { classificacao: 'Cliente', convertedFromLeadId: { not: null } },
      }),
    ]);

    // TODO: totalRevenue/averageRevenue agora calculados via Appointments (sum por tutorId
    //       quando paymentStatus=PAID). Aggregate inline pesado — adicionar quando UI usar.
    return {
      total,
      active,
      inactive,
      companies,
      individuals,
      fromLeads,
      conversionRate: total > 0 ? ((fromLeads / total) * 100).toFixed(1) : '0',
      totalRevenue: 0,
      averageRevenue: 0,
    };
  }

  async updateStatus(id: string, status: TutorStatus) {
    const existing = await this.findById(id);
    const previousStatus = existing.status;

    const tutor = await this.prisma.tutor.update({
      where: { id },
      data: { status },
    });

    if (status !== previousStatus) {
      this.eventEmitter.emit('crm.tutor.status_changed', {
        tutorId: tutor.id,
        previousStatus,
        newStatus: status,
      });
    }

    return tutor;
  }

  async addTags(id: string, tags: string[]) {
    const existing = await this.findById(id);
    const newTags = [...new Set([...(existing.tags || []), ...tags])];

    return this.prisma.tutor.update({
      where: { id },
      data: { tags: newTags },
    });
  }

  async removeTags(id: string, tags: string[]) {
    const existing = await this.findById(id);
    const newTags = (existing.tags || []).filter((t) => !tags.includes(t));

    return this.prisma.tutor.update({
      where: { id },
      data: { tags: newTags },
    });
  }

  async recordPurchase(id: string, _amountCents: number) {
    // DEPRECATED: totalRevenue/totalOrders/lastOrderAt agora derivam de Appointments,
    // não de campos cacheados no Tutor. Este endpoint é um no-op kept for compat
    // até a UI migrar pra registrar Appointment diretamente.
    return this.findById(id);
  }
}
