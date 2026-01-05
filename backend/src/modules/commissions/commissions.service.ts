import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommissionDto } from './dto/create-commission.dto';
import { UpdateCommissionDto } from './dto/update-commission.dto';

type CommissionStatus = 'PENDING' | 'PAID' | 'CANCELLED';
type CommissionType = 'CONSULTATION' | 'SURGERY' | 'HOSPITALIZATION' | 'SERVICE' | 'PRODUCT';

@Injectable()
export class CommissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(params?: {
    page?: number;
    limit?: number;
    status?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const { page = 1, limit = 100, status, userId, startDate, endDate } = params || {};
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) {
      where.paymentStatus = status === 'PAID' ? 'PAID' : status === 'PENDING' ? 'PENDING' : undefined;
    }
    if (userId) where.userId = userId;
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    const [appointments, total] = await Promise.all([
      this.prisma.appointment.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true, role: true } },
          tutor: { select: { id: true, name: true } },
          pet: { select: { id: true, name: true } },
          treatments: { include: { product: true } },
        },
        orderBy: { date: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.appointment.count({ where }),
    ]);

    const commissions = appointments.map((appointment) => {
      let serviceType: CommissionType = 'CONSULTATION';
      let serviceName = appointment.description || 'Consulta';

      try {
        if (appointment.notes) {
          const parsed =
            typeof appointment.notes === 'string' ? JSON.parse(appointment.notes) : (appointment.notes as any);
          if (parsed.type === 'HOSPITALIZATION') {
            serviceType = 'HOSPITALIZATION';
            serviceName = parsed.details?.reason || 'Internação';
          } else if (parsed.type === 'SURGERY') {
            serviceType = 'SURGERY';
            serviceName = parsed.details?.procedure || 'Cirurgia';
          }
        }
      } catch {
        // ignore
      }

      const commissionRates: Record<CommissionType, number> = {
        CONSULTATION: 30,
        SURGERY: 25,
        HOSPITALIZATION: 15,
        SERVICE: 20,
        PRODUCT: 10,
      };

      const commissionRate = commissionRates[serviceType] || 20;
      const commissionValue = (appointment.value * commissionRate) / 100;

      return {
        id: appointment.id,
        appointmentId: appointment.id,
        professional: {
          id: appointment.user.id,
          name: appointment.user.name || appointment.user.email,
          role: appointment.user.role,
          avatar: null,
        },
        service: serviceName,
        serviceType,
        clientName: appointment.tutor.name,
        petName: appointment.pet.name,
        totalValue: appointment.value,
        commissionRate,
        commissionValue,
        status:
          appointment.paymentStatus === 'PAID'
            ? ('PAID' as CommissionStatus)
            : appointment.paymentStatus === 'CANCELLED'
              ? ('CANCELLED' as CommissionStatus)
              : ('PENDING' as CommissionStatus),
        serviceDate: appointment.date.toISOString(),
        paymentDate: appointment.paymentStatus === 'PAID' ? appointment.updatedAt.toISOString() : undefined,
        createdAt: appointment.createdAt.toISOString(),
      };
    });

    return {
      commissions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getById(id: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        tutor: { select: { id: true, name: true } },
        pet: { select: { id: true, name: true } },
        treatments: { include: { product: true } },
      },
    });

    if (!appointment) throw new NotFoundException('Comissão não encontrada');

    let serviceType: CommissionType = 'CONSULTATION';
    let serviceName = appointment.description || 'Consulta';
    try {
      if (appointment.notes) {
        const parsed =
          typeof appointment.notes === 'string' ? JSON.parse(appointment.notes) : (appointment.notes as any);
        if (parsed.type === 'HOSPITALIZATION') {
          serviceType = 'HOSPITALIZATION';
          serviceName = parsed.details?.reason || 'Internação';
        } else if (parsed.type === 'SURGERY') {
          serviceType = 'SURGERY';
          serviceName = parsed.details?.procedure || 'Cirurgia';
        }
      }
    } catch {
      // ignore
    }

    const commissionRates: Record<CommissionType, number> = {
      CONSULTATION: 30,
      SURGERY: 25,
      HOSPITALIZATION: 15,
      SERVICE: 20,
      PRODUCT: 10,
    };
    const commissionRate = commissionRates[serviceType] || 20;
    const commissionValue = (appointment.value * commissionRate) / 100;

    return {
      id: appointment.id,
      appointmentId: appointment.id,
      professional: {
        id: appointment.user.id,
        name: appointment.user.name || appointment.user.email,
        role: appointment.user.role,
        avatar: null,
      },
      service: serviceName,
      serviceType,
      clientName: appointment.tutor.name,
      petName: appointment.pet.name,
      totalValue: appointment.value,
      commissionRate,
      commissionValue,
      status:
        appointment.paymentStatus === 'PAID'
          ? ('PAID' as CommissionStatus)
          : appointment.paymentStatus === 'CANCELLED'
            ? ('CANCELLED' as CommissionStatus)
            : ('PENDING' as CommissionStatus),
      serviceDate: appointment.date.toISOString(),
      paymentDate: appointment.paymentStatus === 'PAID' ? appointment.updatedAt.toISOString() : undefined,
      createdAt: appointment.createdAt.toISOString(),
    };
  }

  async create(dto: CreateCommissionDto) {
    if (!dto.appointmentId) {
      throw new BadRequestException('Criação de comissão sem agendamento não implementada. Use appointmentId.');
    }

    const appointment = await this.prisma.appointment.findUnique({ where: { id: dto.appointmentId } });
    if (!appointment) throw new NotFoundException('Agendamento não encontrado');

    const paymentStatus =
      dto.status === 'PAID' ? 'PAID' : dto.status === 'CANCELLED' ? 'CANCELLED' : 'PENDING';

    await this.prisma.appointment.update({
      where: { id: dto.appointmentId },
      data: { paymentStatus, value: dto.totalValue },
    });

    const updated = await this.prisma.appointment.findUnique({
      where: { id: dto.appointmentId },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        tutor: { select: { id: true, name: true } },
        pet: { select: { id: true, name: true } },
      },
    });
    if (!updated) throw new BadRequestException('Erro ao buscar agendamento atualizado');

    const commissionValue = (dto.totalValue * dto.commissionRate) / 100;

    return {
      id: updated.id,
      appointmentId: updated.id,
      professional: {
        id: updated.user.id,
        name: updated.user.name || updated.user.email,
        role: updated.user.role,
        avatar: null,
      },
      service: dto.serviceName,
      serviceType: dto.serviceType,
      clientName: updated.tutor.name,
      petName: updated.pet.name,
      totalValue: dto.totalValue,
      commissionRate: dto.commissionRate,
      commissionValue,
      status: paymentStatus as CommissionStatus,
      serviceDate: updated.date.toISOString(),
      paymentDate: paymentStatus === 'PAID' ? new Date().toISOString() : undefined,
      createdAt: updated.createdAt.toISOString(),
    };
  }

  async update(id: string, dto: UpdateCommissionDto) {
    const appointment = await this.prisma.appointment.findUnique({ where: { id } });
    if (!appointment) throw new NotFoundException('Comissão não encontrada');

    const updateData: any = {};
    if (dto.status) {
      updateData.paymentStatus = dto.status === 'PAID' ? 'PAID' : dto.status === 'CANCELLED' ? 'CANCELLED' : 'PENDING';
    }
    if (dto.totalValue !== undefined) updateData.value = dto.totalValue;

    const updated = await this.prisma.appointment.update({
      where: { id },
      data: updateData,
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        tutor: { select: { id: true, name: true } },
        pet: { select: { id: true, name: true } },
      },
    });

    // recalcula comissão (mesma lógica de GET)
    let serviceType: CommissionType = 'CONSULTATION';
    let serviceName = updated.description || 'Consulta';
    try {
      if (updated.notes) {
        const parsed = typeof updated.notes === 'string' ? JSON.parse(updated.notes) : (updated.notes as any);
        if (parsed.type === 'HOSPITALIZATION') {
          serviceType = 'HOSPITALIZATION';
          serviceName = parsed.details?.reason || 'Internação';
        } else if (parsed.type === 'SURGERY') {
          serviceType = 'SURGERY';
          serviceName = parsed.details?.procedure || 'Cirurgia';
        }
      }
    } catch {
      // ignore
    }

    const commissionRates: Record<CommissionType, number> = {
      CONSULTATION: 30,
      SURGERY: 25,
      HOSPITALIZATION: 15,
      SERVICE: 20,
      PRODUCT: 10,
    };
    const commissionRate = commissionRates[serviceType] || 20;
    const commissionValue = (updated.value * commissionRate) / 100;

    return {
      id: updated.id,
      appointmentId: updated.id,
      professional: {
        id: updated.user.id,
        name: updated.user.name || updated.user.email,
        role: updated.user.role,
        avatar: null,
      },
      service: serviceName,
      serviceType,
      clientName: updated.tutor.name,
      petName: updated.pet.name,
      totalValue: updated.value,
      commissionRate,
      commissionValue,
      status:
        updated.paymentStatus === 'PAID'
          ? ('PAID' as CommissionStatus)
          : updated.paymentStatus === 'CANCELLED'
            ? ('CANCELLED' as CommissionStatus)
            : ('PENDING' as CommissionStatus),
      serviceDate: updated.date.toISOString(),
      paymentDate: updated.paymentStatus === 'PAID' ? updated.updatedAt.toISOString() : undefined,
      createdAt: updated.createdAt.toISOString(),
    };
  }

  async remove(id: string) {
    const appointment = await this.prisma.appointment.findUnique({ where: { id } });
    if (!appointment) throw new NotFoundException('Comissão não encontrada');

    await this.prisma.appointment.update({
      where: { id },
      data: { paymentStatus: 'CANCELLED', status: 'CANCELED' },
    });

    return { message: 'Comissão cancelada com sucesso' };
  }
}


