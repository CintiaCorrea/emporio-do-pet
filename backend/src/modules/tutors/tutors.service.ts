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

    // Normaliza telefone (remove não-dígitos) pra busca por contato
    const onlyDigits = search ? search.replace(/\D/g, '') : '';
    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
            { cpf: { contains: search } },
            ...(onlyDigits ? [{ contacts: { some: { number: { contains: onlyDigits } } } }] : []),
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

  // === Score do Cliente (4 dimensões, total 100) ===
  // Visitas: 30 pontos (1 ponto por atendimento, capped em 30)
  // LTV: 30 pontos (escala por valor total — R$ 100 = 10pt, capped 30)
  // Recência: 25 pontos (último atendimento — quanto mais recente, mais pontos)
  // NPS: 15 pontos (placeholder até módulo NPS estar pronto)
  async getScoreClient(tutorId: string) {
    const tutor = await this.prisma.tutor.findUnique({ where: { id: tutorId } });
    if (!tutor) return null;

    const appointments = await this.prisma.appointment.findMany({
      where: { tutorId },
      orderBy: { date: 'desc' },
    });

    const visitsScore = Math.min(30, appointments.length);
    const totalRevenue = 0; // TODO: calcular via Appointments quando tiver campo valor
    const ltvScore = Math.min(30, Math.floor(totalRevenue / 100));
    
    let recenciaScore = 0;
    if (appointments[0]) {
      const daysSince = Math.floor((Date.now() - new Date(appointments[0].date).getTime()) / 86400000);
      if (daysSince <= 30) recenciaScore = 25;
      else if (daysSince <= 90) recenciaScore = 18;
      else if (daysSince <= 180) recenciaScore = 10;
      else if (daysSince <= 365) recenciaScore = 5;
    }

    const npsScore = 0; // placeholder

    const total = visitsScore + ltvScore + recenciaScore + npsScore;
    const label = total >= 70 ? 'Ativo' : total >= 30 ? 'Acompanhando' : 'Inativo';

    return {
      total,
      label,
      dimensions: {
        visitas: { score: visitsScore, max: 30, value: appointments.length },
        ltv: { score: ltvScore, max: 30, value: totalRevenue },
        recencia: { score: recenciaScore, max: 25, value: appointments[0]?.date || null },
        nps: { score: npsScore, max: 15, value: null },
      },
    };
  }

  async findByIdExpanded(id: string) {
    const tutor = await this.findById(id);
    if (!tutor) return null;
    const score = await this.getScoreClient(id);
    return { ...tutor, score };
  }


  async profileStats(tutorId: string) {
    const tutor = await this.prisma.tutor.findUnique({ where: { id: tutorId } });
    if (!tutor) throw new NotFoundException('Tutor não encontrado');
    const now = new Date();
    const apps = await this.prisma.appointment.findMany({
      where: { tutorId },
      select: { id: true, date: true, value: true, status: true, paymentStatus: true, petId: true },
      orderBy: { date: 'desc' },
    });
    const pets = await this.prisma.pet.findMany({ where: { tutorId }, select: { id: true, name: true, species: true, status: true } });
    const realizadas = apps.filter(a => a.status === 'COMPLETED' || a.status === 'DONE' || a.date < now);
    const ultima = realizadas[0];
    const valorTotal = realizadas.reduce((s, a) => s + (a.value || 0), 0);
    const valorPago = realizadas.filter(a => a.paymentStatus === 'PAID').reduce((s, a) => s + (a.value || 0), 0);
    const valorAReceber = valorTotal - valorPago;

    // Frequência últimos 12 meses
    const freq: { mes: string; total: number; valor: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const next = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const apsDoMes = realizadas.filter(a => { const ad = new Date(a.date); return ad >= d && ad < next; });
      freq.push({ mes: d.toLocaleDateString('pt-BR', { month: 'short' }), total: apsDoMes.length, valor: +apsDoMes.reduce((s, a) => s + (a.value || 0), 0).toFixed(2) });
    }

    const diasDesdeUltima = ultima ? Math.floor((now.getTime() - new Date(ultima.date).getTime()) / 86400000) : null;
    const futurasAgendadas = apps.filter(a => new Date(a.date) >= now && a.status !== 'CANCELLED').length;

    return {
      totalAppointments: realizadas.length,
      futurasAgendadas,
      diasDesdeUltima,
      valorTotal: +valorTotal.toFixed(2),
      valorPago: +valorPago.toFixed(2),
      valorAReceber: +valorAReceber.toFixed(2),
      ticketMedio: realizadas.length > 0 ? +(valorTotal / realizadas.length).toFixed(2) : 0,
      totalPets: pets.length,
      petsAtivos: pets.filter(p => p.status === 'ACTIVE').length,
      pets,
      frequenciaMensal: freq,
    };
  }
}