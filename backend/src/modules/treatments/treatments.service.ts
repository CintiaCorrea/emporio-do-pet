import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTreatmentDto } from './dto/create-treatment.dto';
import { UpdateTreatmentDto } from './dto/update-treatment.dto';

@Injectable()
export class TreatmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(params?: {
    page?: number;
    limit?: number;
    skip?: number;
    take?: number;
    search?: string;
    appointmentId?: string;
    petId?: string;
  }) {
    const { page = 1, limit = 10, skip, take, search, appointmentId, petId } = params || {};
    const resolvedTake = Number.isFinite(take as any) ? (take as number) : limit;
    const resolvedSkip =
      Number.isFinite(skip as any) ? (skip as number) : Math.max(0, (page - 1) * resolvedTake);

    const where: any = {};
    if (appointmentId) where.appointmentId = appointmentId;
    if (petId) where.petId = petId;
    if (search) {
      where.OR = [
        { description: { contains: search, mode: 'insensitive' as const } },
        { product: { name: { contains: search, mode: 'insensitive' as const } } },
        { appointment: { description: { contains: search, mode: 'insensitive' as const } } },
        { pet: { name: { contains: search, mode: 'insensitive' as const } } },
      ];
    }

    const [treatments, total, totalCost] = await Promise.all([
      this.prisma.treatment.findMany({
        where,
        include: {
          appointment: {
            select: {
              id: true,
              date: true,
              description: true,
              status: true,
              tutor: { select: { id: true, name: true } },
            },
          },
          pet: { select: { id: true, name: true, species: true, breed: true } },
          product: { select: { id: true, name: true, type: true, price: true, stock: true } },
        },
        orderBy: { createdAt: 'desc' as const },
        skip: resolvedSkip,
        take: resolvedTake,
      }),
      this.prisma.treatment.count({ where }),
      this.prisma.treatment.aggregate({ where, _sum: { cost: true } }),
    ]);

    return {
      treatments,
      totals: {
        cost: totalCost._sum.cost || 0,
      },
      pagination: {
        page,
        limit: resolvedTake,
        total,
        pages: Math.ceil(total / resolvedTake),
      },
    };
  }

  async findById(id: string) {
    const treatment = await this.prisma.treatment.findUnique({
      where: { id },
      include: {
        appointment: {
          include: {
            tutor: {
              select: {
                id: true,
                name: true,
                contacts: { where: { isPrimary: true }, take: 1 },
              },
            },
            pet: { select: { id: true, name: true, species: true, breed: true } },
          },
        },
        pet: { include: { tutor: { select: { id: true, name: true } } } },
        product: { select: { id: true, name: true, type: true, price: true, stock: true } },
      },
    });

    if (!treatment) throw new NotFoundException('Treatment não encontrado');
    return treatment;
  }

  async create(dto: CreateTreatmentDto) {
    if (!dto.appointmentId || !dto.petId || !dto.description) {
      throw new BadRequestException('Appointment, pet, descrição e custo são obrigatórios');
    }

    const appointment = await this.prisma.appointment.findUnique({
      where: { id: dto.appointmentId },
      include: { pet: true },
    });
    if (!appointment) throw new NotFoundException('Appointment não encontrado');
    if (appointment.petId !== dto.petId) {
      throw new BadRequestException('Pet não pertence ao appointment informado');
    }

    if (dto.productId) {
      const product = await this.prisma.product.findUnique({ where: { id: dto.productId } });
      if (!product) throw new NotFoundException('Produto não encontrado');
      if (product.type !== ('SERVICE' as any) && product.stock < 1) {
        throw new BadRequestException('Produto sem estoque disponível');
      }
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const treatment = await tx.treatment.create({
        data: {
          appointmentId: dto.appointmentId,
          petId: dto.petId,
          description: dto.description,
          cost: dto.cost,
          productId: dto.productId || null,
        },
      });

      if (dto.productId) {
        const product = await tx.product.findUnique({ where: { id: dto.productId } });
        if (product && product.type !== ('SERVICE' as any)) {
          await tx.product.update({
            where: { id: dto.productId },
            data: { stock: { decrement: 1 } },
          });
        }
      }

      return tx.treatment.findUnique({
        where: { id: treatment.id },
        include: {
          appointment: {
            select: {
              id: true,
              date: true,
              description: true,
              tutor: { select: { id: true, name: true } },
            },
          },
          pet: { select: { id: true, name: true, species: true } },
          product: { select: { id: true, name: true, type: true, price: true } },
        },
      });
    });

    return result;
  }

  async update(id: string, dto: UpdateTreatmentDto) {
    const existing = await this.prisma.treatment.findUnique({
      where: { id },
      include: { product: true },
    });
    if (!existing) throw new NotFoundException('Treatment não encontrado');

    // Se trocou product, gerenciar estoque (devolve o antigo e retira o novo)
    if (dto.productId !== undefined && dto.productId !== existing.productId) {
      if (dto.productId) {
        const newProduct = await this.prisma.product.findUnique({ where: { id: dto.productId } });
        if (!newProduct) throw new NotFoundException('Produto não encontrado');
        if (newProduct.type !== ('SERVICE' as any) && newProduct.stock < 1) {
          throw new BadRequestException('Produto sem estoque disponível');
        }
      }

      await this.prisma.$transaction(async (tx) => {
        if (existing.productId) {
          const oldProduct = await tx.product.findUnique({ where: { id: existing.productId } });
          if (oldProduct && oldProduct.type !== ('SERVICE' as any)) {
            await tx.product.update({
              where: { id: existing.productId },
              data: { stock: { increment: 1 } },
            });
          }
        }

        if (dto.productId) {
          const newProduct = await tx.product.findUnique({ where: { id: dto.productId } });
          if (newProduct && newProduct.type !== ('SERVICE' as any)) {
            await tx.product.update({
              where: { id: dto.productId },
              data: { stock: { decrement: 1 } },
            });
          }
        }
      });
    }

    const data: any = {};
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.cost !== undefined) data.cost = dto.cost;
    if (dto.productId !== undefined) data.productId = dto.productId || null;
    if (dto.appointmentId !== undefined) data.appointmentId = dto.appointmentId;
    if (dto.petId !== undefined) data.petId = dto.petId;

    return this.prisma.treatment.update({
      where: { id },
      data,
      include: {
        appointment: {
          select: {
            id: true,
            date: true,
            description: true,
            tutor: { select: { id: true, name: true } },
          },
        },
        pet: { select: { id: true, name: true, species: true } },
        product: { select: { id: true, name: true, type: true, price: true } },
      },
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.treatment.findUnique({
      where: { id },
      include: { product: true },
    });
    if (!existing) throw new NotFoundException('Treatment não encontrado');

    if (existing.productId && existing.product?.type !== ('SERVICE' as any)) {
      await this.prisma.product.update({
        where: { id: existing.productId },
        data: { stock: { increment: 1 } },
      });
    }

    await this.prisma.treatment.delete({ where: { id } });
    return { message: 'Treatment excluído com sucesso' };
  }
}


