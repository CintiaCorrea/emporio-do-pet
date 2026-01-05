import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBoardDto } from './dto/create-board.dto';
import { UpdateBoardDto } from './dto/update-board.dto';

@Injectable()
export class BoardsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, createBoardDto: CreateBoardDto) {
    return this.prisma.board.create({
      data: {
        ...createBoardDto,
        userId,
        // Mantém paridade com o frontend (vet-crm) que cria colunas padrão ao criar um board.
        columns: {
          create: [
            { name: 'A Fazer', position: 1, color: '#FF6B6B' },
            { name: 'Em Progresso', position: 2, color: '#FFD93D' },
            { name: 'Concluído', position: 3, color: '#6BCB77' },
          ],
        },
      },
      include: {
        columns: {
          orderBy: { position: 'asc' },
        },
      },
    });
  }

  async findAll(userId: string) {
    return this.prisma.board.findMany({
      where: { userId },
      include: {
        columns: {
          orderBy: { position: 'asc' },
          include: {
            _count: { select: { cards: true } },
          },
        },
        _count: {
          select: { appointments: true },
        },
      },
      orderBy: [{ favorite: 'desc' }, { updatedAt: 'desc' }],
    });
  }

  async findById(id: string, userId: string) {
    const board = await this.prisma.board.findFirst({
      where: { id, userId },
      include: {
        columns: {
          orderBy: { position: 'asc' },
          include: {
            cards: {
              orderBy: { position: 'asc' },
              include: {
                appointment: {
                  include: {
                    tutor: { select: { id: true, name: true } },
                    pet: { select: { id: true, name: true, species: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!board) {
      throw new NotFoundException('Board não encontrado');
    }

    return board;
  }

  async update(id: string, userId: string, updateBoardDto: UpdateBoardDto) {
    await this.findById(id, userId);

    return this.prisma.board.update({
      where: { id },
      data: updateBoardDto,
      include: {
        columns: {
          orderBy: { position: 'asc' },
        },
      },
    });
  }

  async remove(id: string, userId: string) {
    await this.findById(id, userId);

    return this.prisma.board.delete({
      where: { id },
    });
  }

  async toggleFavorite(id: string, userId: string) {
    const board = await this.findById(id, userId);

    return this.prisma.board.update({
      where: { id },
      data: { favorite: !board.favorite },
    });
  }
}

