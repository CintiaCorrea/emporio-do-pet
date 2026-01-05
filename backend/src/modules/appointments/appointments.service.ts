import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';

@Injectable()
export class AppointmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createAppointmentDto: CreateAppointmentDto) {
    // Validações mínimas (compatível com o antigo /api/appointments do Next)
    if (!createAppointmentDto.tutorId || !createAppointmentDto.userId || !createAppointmentDto.date) {
      throw new BadRequestException('Tutor, veterinário (userId) e data são obrigatórios');
    }

    const existingTutor = await this.prisma.tutor.findUnique({
      where: { id: createAppointmentDto.tutorId },
    });
    if (!existingTutor) throw new NotFoundException('Tutor não encontrado');

    const existingUser = await this.prisma.user.findUnique({
      where: { id: createAppointmentDto.userId },
    });
    if (!existingUser) throw new NotFoundException('Veterinário não encontrado');

    // Criar pet se necessário
    let finalPetId = createAppointmentDto.petId;
    if ((!finalPetId || finalPetId === '') && createAppointmentDto.pet) {
      const newPet = await this.prisma.pet.create({
        data: {
          name: createAppointmentDto.pet.name,
          species: createAppointmentDto.pet.species as any,
          breed: createAppointmentDto.pet.breed || null,
          tutorId: createAppointmentDto.tutorId,
          status: 'ACTIVE',
        },
      });
      finalPetId = newPet.id;
    }

    if (!finalPetId) {
      throw new BadRequestException('Pet é obrigatório. Selecione um pet existente ou crie um novo.');
    }

    const existingPet = await this.prisma.pet.findFirst({
      where: { id: finalPetId, tutorId: createAppointmentDto.tutorId },
    });
    if (!existingPet) {
      throw new NotFoundException('Pet não encontrado ou não pertence ao tutor informado');
    }

    const appointmentDate = new Date(createAppointmentDto.date);
    const finalStatus = createAppointmentDto.status || 'SCHEDULED';

    const appointmentData: any = {
      tutorId: createAppointmentDto.tutorId,
      petId: finalPetId,
      userId: createAppointmentDto.userId,
      date: appointmentDate,
      duration: createAppointmentDto.duration || 30,
      description: createAppointmentDto.description ?? null,
      notes: createAppointmentDto.notes ?? null,
      value: createAppointmentDto.value || 0,
      status: finalStatus,
      paymentStatus: createAppointmentDto.paymentStatus || 'PENDING',
      ...(createAppointmentDto.boardId && { boardId: createAppointmentDto.boardId }),
    };

    const result = await this.prisma.$transaction(async (tx) => {
      const appointment = await tx.appointment.create({ data: appointmentData });

      if (createAppointmentDto.treatments && createAppointmentDto.treatments.length > 0) {
        for (const t of createAppointmentDto.treatments) {
          if (t.productId) {
            const p = await tx.product.findUnique({ where: { id: t.productId } });
            if (!p) {
              throw new BadRequestException(`Produto com ID ${t.productId} não encontrado`);
            }
          }
        }

        await tx.treatment.createMany({
          data: createAppointmentDto.treatments.map((t) => ({
            description: t.description,
            cost: t.cost,
            productId: t.productId || null,
            appointmentId: appointment.id,
            petId: finalPetId!,
          })),
        });
      }

      return tx.appointment.findUnique({
        where: { id: appointment.id },
        include: {
          tutor: { select: { id: true, name: true } },
          pet: { select: { id: true, name: true, species: true } },
          user: { select: { id: true, name: true, email: true } },
          treatments: { include: { product: true } },
          _count: { select: { treatments: true } },
        },
      });
    });

    return result;
  }

  async findAll(params?: {
    userId?: string;
    tutorId?: string;
    petId?: string;
    status?: string;
    paymentStatus?: string;
    search?: string;
    startDate?: Date;
    endDate?: Date;
    skip?: number;
    take?: number;
    page?: number;
    limit?: number;
  }) {
    const {
      userId,
      tutorId,
      petId,
      status,
      paymentStatus,
      search,
      startDate,
      endDate,
      skip,
      take,
      page = 1,
      limit = 10,
    } = params || {};

    const resolvedTake = Number.isFinite(take as any) ? (take as number) : limit;
    const resolvedSkip =
      Number.isFinite(skip as any) ? (skip as number) : Math.max(0, (page - 1) * resolvedTake);

    const where: any = {
      ...(userId && { userId }),
      ...(tutorId && { tutorId }),
      ...(petId && { petId }),
      ...(status && { status }),
      ...(paymentStatus && { paymentStatus }),
    };

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = startDate;
      if (endDate) where.date.lte = endDate;
    }

    if (search) {
      where.OR = [
        { description: { contains: search, mode: 'insensitive' as const } },
        { notes: { contains: search, mode: 'insensitive' as const } },
        { tutor: { name: { contains: search, mode: 'insensitive' as const } } },
        { pet: { name: { contains: search, mode: 'insensitive' as const } } },
      ];
    }

    const [appointments, total, totalValue] = await Promise.all([
      this.prisma.appointment.findMany({
        where,
        skip: resolvedSkip,
        take: resolvedTake,
        include: {
          tutor: {
            select: {
              id: true,
              name: true,
              contacts: { where: { isPrimary: true }, take: 1 },
            },
          },
          pet: { select: { id: true, name: true, species: true, breed: true } },
          user: { select: { id: true, name: true, email: true } },
          treatments: {
            include: {
              product: { select: { id: true, name: true, type: true, price: true } },
            },
          },
          kanbanCard: {
            select: {
              id: true,
              title: true,
              column: { select: { name: true, color: true } },
            },
          },
          _count: { select: { treatments: true } },
        },
        orderBy: { date: 'desc' },
      }),
      this.prisma.appointment.count({ where }),
      this.prisma.appointment.aggregate({ where, _sum: { value: true } }),
    ]);

    return {
      appointments,
      totals: { value: totalValue._sum.value || 0 },
      pagination: {
        page,
        limit: resolvedTake,
        total,
        pages: Math.ceil(total / resolvedTake),
      },
    };
  }

  async findById(id: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: {
        tutor: {
          select: {
            id: true,
            name: true,
            contacts: { where: { isPrimary: true }, take: 1 },
          },
        },
        pet: {
          select: {
            id: true,
            name: true,
            species: true,
            breed: true,
            gender: true,
            birthDate: true,
            weight: true,
          },
        },
        user: { select: { id: true, name: true, email: true } },
        treatments: {
          include: {
            product: { select: { id: true, name: true, type: true, price: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        kanbanCard: {
          select: {
            id: true,
            title: true,
            column: { select: { id: true, name: true, color: true } },
          },
        },
        _count: { select: { treatments: true } },
      },
    });

    if (!appointment) {
      throw new NotFoundException('Agendamento não encontrado');
    }

    return appointment;
  }

  async update(id: string, updateAppointmentDto: UpdateAppointmentDto) {
    await this.findById(id);

    // Validações de relacionamentos (compatível com o Next)
    if (updateAppointmentDto.tutorId) {
      const tutor = await this.prisma.tutor.findUnique({ where: { id: updateAppointmentDto.tutorId } });
      if (!tutor) throw new NotFoundException('Tutor não encontrado');
    }

    if (updateAppointmentDto.userId) {
      const user = await this.prisma.user.findUnique({ where: { id: updateAppointmentDto.userId } });
      if (!user) throw new NotFoundException('Veterinário não encontrado');
    }

    if (updateAppointmentDto.petId && updateAppointmentDto.tutorId) {
      const pet = await this.prisma.pet.findFirst({
        where: { id: updateAppointmentDto.petId, tutorId: updateAppointmentDto.tutorId },
      });
      if (!pet) throw new NotFoundException('Pet não encontrado ou não pertence ao tutor informado');
    }

    const updateData: any = {};
    if (updateAppointmentDto.tutorId !== undefined) updateData.tutorId = updateAppointmentDto.tutorId;
    if (updateAppointmentDto.petId !== undefined) updateData.petId = updateAppointmentDto.petId;
    if (updateAppointmentDto.userId !== undefined) updateData.userId = updateAppointmentDto.userId;
    if (updateAppointmentDto.date !== undefined) updateData.date = new Date(updateAppointmentDto.date);
    if (updateAppointmentDto.description !== undefined) updateData.description = updateAppointmentDto.description;
    if (updateAppointmentDto.notes !== undefined) updateData.notes = updateAppointmentDto.notes;
    if (updateAppointmentDto.value !== undefined) updateData.value = updateAppointmentDto.value;
    if (updateAppointmentDto.duration !== undefined) updateData.duration = updateAppointmentDto.duration;
    if (updateAppointmentDto.status !== undefined) updateData.status = updateAppointmentDto.status;
    if (updateAppointmentDto.paymentStatus !== undefined) updateData.paymentStatus = updateAppointmentDto.paymentStatus;
    if (updateAppointmentDto.boardId !== undefined) updateData.boardId = updateAppointmentDto.boardId;

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedAppointment = await tx.appointment.update({ where: { id }, data: updateData });

      if (updateAppointmentDto.treatments !== undefined) {
        await tx.treatment.deleteMany({ where: { appointmentId: id } });

        if (updateAppointmentDto.treatments && updateAppointmentDto.treatments.length > 0) {
          for (const t of updateAppointmentDto.treatments) {
            if (t.productId) {
              const p = await tx.product.findUnique({ where: { id: t.productId } });
              if (!p) throw new BadRequestException(`Produto com ID ${t.productId} não encontrado`);
            }
          }

          await tx.treatment.createMany({
            data: updateAppointmentDto.treatments.map((t) => ({
              description: t.description,
              cost: t.cost,
              productId: t.productId || null,
              appointmentId: id,
              petId: (updateAppointmentDto.petId || updatedAppointment.petId) as string,
            })) as any,
          });
        }
      }

      return tx.appointment.findUnique({
        where: { id },
        include: {
          tutor: { select: { id: true, name: true } },
          pet: { select: { id: true, name: true, species: true } },
          user: { select: { id: true, name: true, email: true } },
          treatments: { include: { product: true } },
          _count: { select: { treatments: true } },
        },
      });
    });

    return result;
  }

  async remove(id: string) {
    await this.findById(id);

    return this.prisma.appointment.delete({
      where: { id },
    });
  }

  async getUpcoming(userId?: string, days = 7) {
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);

    return this.findAll({
      userId,
      startDate,
      endDate,
      take: 50,
    });
  }
}

