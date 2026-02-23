import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';

@Injectable()
export class ContactsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(params?: {
    page?: number;
    limit?: number;
    skip?: number;
    take?: number;
    search?: string;
    tutorId?: string;
  }) {
    const { page = 1, limit = 10, skip, take, search, tutorId } = params || {};
    const resolvedTake = Number.isFinite(take as any) ? (take as number) : limit;
    const resolvedSkip = Number.isFinite(skip as any)
      ? (skip as number)
      : Math.max(0, (page - 1) * resolvedTake);

    const where: any = {};
    if (tutorId) where.tutorId = tutorId;
    if (search) {
      where.OR = [
        { number: { contains: search, mode: 'insensitive' as const } },
        { observations: { contains: search, mode: 'insensitive' as const } },
        { tutor: { name: { contains: search, mode: 'insensitive' as const } } },
      ];
    }

    const [contacts, total] = await Promise.all([
      this.prisma.contact.findMany({
        where,
        include: {
          tutor: { select: { id: true, name: true, cpf: true } },
        },
        orderBy: [{ isPrimary: 'desc' as const }, { createdAt: 'desc' as const }],
        skip: resolvedSkip,
        take: resolvedTake,
      }),
      this.prisma.contact.count({ where }),
    ]);

    return {
      contacts,
      pagination: {
        page,
        limit: resolvedTake,
        total,
        pages: Math.ceil(total / resolvedTake),
      },
    };
  }

  async findById(id: string) {
    const contact = await this.prisma.contact.findUnique({
      where: { id },
      include: {
        tutor: {
          select: {
            id: true,
            name: true,
            cpf: true,
            contacts: {
              where: { id: { not: id } },
              select: { id: true, type: true, number: true, isPrimary: true },
            },
          },
        },
      },
    });

    if (!contact) throw new NotFoundException('Contato não encontrado');
    return contact;
  }

  async create(dto: CreateContactDto) {
    const tutor = await this.prisma.tutor.findUnique({ where: { id: dto.tutorId } });
    if (!tutor) throw new NotFoundException('Tutor não encontrado');

    const existingContact = await this.prisma.contact.findFirst({
      where: { tutorId: dto.tutorId, number: dto.number },
    });
    if (existingContact) {
      throw new BadRequestException('Já existe um contato com este número para este tutor');
    }

    if (dto.isPrimary) {
      await this.prisma.contact.updateMany({
        where: { tutorId: dto.tutorId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    return this.prisma.contact.create({
      data: {
        type: dto.type as any,
        number: dto.number,
        isWhatsApp: dto.isWhatsApp ?? false,
        observations: dto.observations,
        isPrimary: dto.isPrimary ?? false,
        tutorId: dto.tutorId,
      },
      include: { tutor: { select: { id: true, name: true, cpf: true } } },
    });
  }

  async update(id: string, dto: UpdateContactDto) {
    const existing = await this.prisma.contact.findUnique({
      where: { id },
      include: { tutor: true },
    });
    if (!existing) throw new NotFoundException('Contato não encontrado');

    // Se marcou como primário, desmarca outros
    if (dto.isPrimary === true) {
      await this.prisma.contact.updateMany({
        where: { tutorId: existing.tutorId, id: { not: id }, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    // Se mudou tutor, validar
    if (dto.tutorId && dto.tutorId !== existing.tutorId) {
      const tutor = await this.prisma.tutor.findUnique({ where: { id: dto.tutorId } });
      if (!tutor) throw new NotFoundException('Novo tutor não encontrado');
    }

    const data: any = {};
    if (dto.type !== undefined) data.type = dto.type as any;
    if (dto.number !== undefined) data.number = dto.number;
    if (dto.isWhatsApp !== undefined) data.isWhatsApp = dto.isWhatsApp;
    if (dto.observations !== undefined) data.observations = dto.observations;
    if (dto.isPrimary !== undefined) data.isPrimary = dto.isPrimary;
    if (dto.tutorId !== undefined) data.tutorId = dto.tutorId;

    return this.prisma.contact.update({
      where: { id },
      data,
      include: { tutor: { select: { id: true, name: true, cpf: true } } },
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.contact.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Contato não encontrado');

    await this.prisma.contact.delete({ where: { id } });
    return { message: 'Contato excluído com sucesso' };
  }
}
