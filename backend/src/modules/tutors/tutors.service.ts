import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTutorDto } from './dto/create-tutor.dto';
import { UpdateTutorDto } from './dto/update-tutor.dto';

@Injectable()
export class TutorsService {
  constructor(private readonly prisma: PrismaService) {}

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

    return this.prisma.tutor.create({
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

