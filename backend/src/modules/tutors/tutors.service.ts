import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTutorDto } from './dto/create-tutor.dto';
import { UpdateTutorDto } from './dto/update-tutor.dto';

@Injectable()
export class TutorsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createTutorDto: CreateTutorDto) {
    return this.prisma.tutor.create({
      data: createTutorDto,
      include: {
        contacts: true,
        pets: true,
      },
    });
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
}

