import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePetDto } from './dto/create-pet.dto';
import { UpdatePetDto } from './dto/update-pet.dto';

@Injectable()
export class PetsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createPetDto: CreatePetDto) {
    return this.prisma.pet.create({
      data: createPetDto,
      include: {
        tutor: true,
      },
    });
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
    const resolvedSkip =
      Number.isFinite(skip as any) ? (skip as number) : Math.max(0, (page - 1) * resolvedTake);

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
}

