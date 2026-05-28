import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService, PrismaTransactionClient } from '../prisma/prisma.service';
import { CreateColumnDto } from './dto/create-column.dto';
import { UpdateColumnDto } from './dto/update-column.dto';
import { CreateCardDto } from './dto/create-card.dto';

@Injectable()
export class ColumnsService {
  constructor(private readonly prisma: PrismaService) {}

  private toDbPosition(zeroBased?: number) {
    return typeof zeroBased === 'number' ? zeroBased + 1 : undefined;
  }

  async assertBoardOwnership(boardId: string, userId: string) {
    const board = await this.prisma.board.findFirst({
      where: { id: boardId, userId },
      select: { id: true },
    });
    if (!board) throw new NotFoundException('Board não encontrado');
  }

  async findColumnForUser(columnId: string, userId: string) {
    const column = await this.prisma.kanbanColumn.findFirst({
      where: {
        id: columnId,
        board: { userId },
      },
      include: {
        board: { select: { id: true, userId: true } },
      },
    });
    if (!column) throw new NotFoundException('Coluna não encontrada');
    if (column.board.userId !== userId) throw new ForbiddenException('Acesso não autorizado');
    return column;
  }

  async listBoardColumns(boardId: string, userId: string) {
    await this.assertBoardOwnership(boardId, userId);
    return this.prisma.kanbanColumn.findMany({
      where: { boardId },
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
            lead: {
              select: {
                id: true,
                name: true,
                email: true,
                status: true,
                currentScore: true,
                source: true,
                tags: true,
              },
            },
            tutor: {
              select: {
                id: true,
                name: true,
                email: true,
                status: true,
                type: true,
                totalRevenue: true,
              },
            },
          },
        },
      },
    });
  }

  async createBoardColumn(boardId: string, userId: string, dto: CreateColumnDto) {
    await this.assertBoardOwnership(boardId, userId);

    const board = await this.prisma.board.findFirst({
      where: { id: boardId },
      select: { type: true },
    });
    const systemTypes = new Set(['APPOINTMENT', 'CONSULTATION', 'HOSPITALIZATION']);
    if (board && systemTypes.has(board.type)) {
      throw new ForbiddenException(
        'Não é possível adicionar colunas em boards de sistema',
      );
    }

    return this.prisma.$transaction(async (tx: PrismaTransactionClient) => {
      const existingCount = await tx.kanbanColumn.count({ where: { boardId } });
      const desiredIndex = dto.position ?? existingCount; // 0-based
      const desiredDbPosition = desiredIndex + 1; // 1-based

      // Shift columns to avoid unique(boardId, position) conflicts
      await tx.kanbanColumn.updateMany({
        where: { boardId, position: { gte: desiredDbPosition } },
        data: { position: { increment: 1 } },
      });

      return tx.kanbanColumn.create({
        data: {
          name: dto.name,
          color: dto.color,
          position: desiredDbPosition,
          boardId,
        },
        include: { cards: true },
      });
    });
  }

  async batchUpdateBoardColumns(
    boardId: string,
    userId: string,
    updates: { id: string; position: number }[],
  ) {
    await this.assertBoardOwnership(boardId, userId);

    return this.prisma.$transaction(async (tx: PrismaTransactionClient) => {
      const columnIds = updates.map((u) => u.id);

      const existing = await tx.kanbanColumn.findMany({
        where: { boardId, id: { in: columnIds } },
        select: { id: true },
      });

      if (existing.length !== columnIds.length) {
        throw new ForbiddenException('Uma ou mais colunas não pertencem a este board');
      }

      // To avoid unique conflicts, move all involved columns to a temp negative space first
      await Promise.all(
        updates.map((u, idx) =>
          tx.kanbanColumn.update({
            where: { id: u.id },
            data: { position: -(idx + 1) },
          }),
        ),
      );

      // Now set final positions (convert 0-based -> 1-based)
      await Promise.all(
        updates.map((u) =>
          tx.kanbanColumn.update({
            where: { id: u.id },
            data: { position: u.position + 1 },
          }),
        ),
      );

      return tx.kanbanColumn.findMany({
        where: { boardId },
        orderBy: { position: 'asc' },
        include: { cards: { orderBy: { position: 'asc' } } },
      });
    });
  }

  private async assertNotSystemColumn(columnId: string) {
    const column = await this.prisma.kanbanColumn.findFirst({
      where: { id: columnId },
      include: { board: { select: { type: true } } },
    });
    if (!column) return;
    const systemTypes = new Set(['APPOINTMENT', 'CONSULTATION', 'HOSPITALIZATION']);
    if (systemTypes.has(column.board.type)) {
      throw new ForbiddenException(
        'Colunas de boards de sistema não podem ser alteradas ou excluídas',
      );
    }
  }

  async updateColumn(columnId: string, userId: string, dto: UpdateColumnDto) {
    const column = await this.findColumnForUser(columnId, userId);

    const board = await this.prisma.board.findFirst({
      where: { id: column.boardId },
      select: { type: true },
    });
    const systemTypes = new Set(['APPOINTMENT', 'CONSULTATION', 'HOSPITALIZATION']);
    if (board && systemTypes.has(board.type)) {
      if (dto.name !== undefined) {
        throw new ForbiddenException(
          'Colunas de boards de sistema não podem ser renomeadas',
        );
      }
    }

    if (dto.position !== undefined) {
      return this.moveColumn(columnId, userId, dto.position, dto);
    }

    return this.prisma.kanbanColumn.update({
      where: { id: columnId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.color !== undefined ? { color: dto.color } : {}),
      },
      include: { cards: { orderBy: { position: 'asc' } } },
    });
  }

  private async moveColumn(
    columnId: string,
    userId: string,
    newIndex: number,
    dto?: UpdateColumnDto,
  ) {
    const column = await this.findColumnForUser(columnId, userId);

    return this.prisma.$transaction(async (tx: PrismaTransactionClient) => {
      const boardId = column.boardId;

      // Estratégia "2 fases" para evitar P2002 (boardId, position):
      // 1) lê todas as colunas do board ordenadas
      // 2) move no array (0-based)
      // 3) grava posições temporárias negativas (únicas)
      // 4) grava posições finais (1-based)
      const columns = await tx.kanbanColumn.findMany({
        where: { boardId },
        orderBy: { position: 'asc' },
        select: { id: true },
      });

      const fromIndex = columns.findIndex((c: { id: string }) => c.id === columnId);
      if (fromIndex === -1) throw new NotFoundException('Coluna não encontrada');

      const clampedToIndex = Math.max(0, Math.min(newIndex, columns.length - 1));
      if (fromIndex === clampedToIndex && dto?.name === undefined && dto?.color === undefined) {
        return tx.kanbanColumn.findUnique({
          where: { id: columnId },
          include: { cards: { orderBy: { position: 'asc' } } },
        });
      }

      const reordered = [...columns];
      const [moved] = reordered.splice(fromIndex, 1);
      reordered.splice(clampedToIndex, 0, moved);

      // Fase 1: posições temporárias negativas
      await Promise.all(
        reordered.map((c, idx) =>
          tx.kanbanColumn.update({
            where: { id: c.id },
            data: { position: -(idx + 1) },
          }),
        ),
      );

      // Fase 2: posições finais 1-based
      await Promise.all(
        reordered.map((c, idx) =>
          tx.kanbanColumn.update({
            where: { id: c.id },
            data: { position: idx + 1 },
          }),
        ),
      );

      // Atualiza campos opcionais (nome/cor) após a reordenação
      if (dto?.name !== undefined || dto?.color !== undefined) {
        await tx.kanbanColumn.update({
          where: { id: columnId },
          data: {
            ...(dto?.name !== undefined ? { name: dto.name } : {}),
            ...(dto?.color !== undefined ? { color: dto.color } : {}),
          },
        });
      }

      return tx.kanbanColumn.findUnique({
        where: { id: columnId },
        include: { cards: { orderBy: { position: 'asc' } } },
      });
    });
  }

  async deleteColumn(columnId: string, userId: string) {
    const column = await this.findColumnForUser(columnId, userId);

    await this.assertNotSystemColumn(columnId);

    return this.prisma.$transaction(async (tx: PrismaTransactionClient) => {
      const boardId = column.boardId;

      await tx.kanbanCard.deleteMany({ where: { columnId } });
      await tx.kanbanColumn.delete({ where: { id: columnId } });

      // Re-sequence positions to keep them dense (1..N)
      const remaining = await tx.kanbanColumn.findMany({
        where: { boardId },
        orderBy: { position: 'asc' },
        select: { id: true, position: true },
      });

      await Promise.all(
        remaining.map((c: { id: string }, idx: number) =>
          tx.kanbanColumn.update({
            where: { id: c.id },
            data: { position: idx + 1 },
          }),
        ),
      );

      return {
        message: 'Coluna excluída com sucesso',
        deletedColumn: { id: columnId, name: column.name },
      };
    });
  }

  async createCard(columnId: string, userId: string, dto: CreateCardDto) {
    const column = await this.findColumnForUser(columnId, userId);

    // Validate that only one entity is linked
    const entityLinks = [dto.appointmentId, dto.leadId, dto.tutorId].filter(Boolean);
    if (entityLinks.length > 1) {
      throw new BadRequestException('Card can only be linked to one entity (appointment, lead, or client)');
    }

    return this.prisma.$transaction(async (tx: PrismaTransactionClient) => {
      // Validate entity references
      if (dto.appointmentId) {
        const appt = await tx.appointment.findFirst({
          where: { id: dto.appointmentId },
          select: { id: true },
        });
        if (!appt) throw new NotFoundException('Agendamento não encontrado');
      }

      if (dto.leadId) {
        const lead = await tx.lead.findFirst({
          where: { id: dto.leadId },
          select: { id: true },
        });
        if (!lead) throw new NotFoundException('Lead não encontrado');
      }

      if (dto.tutorId) {
        const tutor = await tx.tutor.findFirst({
          where: { id: dto.tutorId },
          select: { id: true },
        });
        if (!tutor) throw new NotFoundException('Cliente não encontrado');
      }

      const existingCards = await tx.kanbanCard.findMany({
        where: { columnId },
        orderBy: { position: 'asc' },
        select: { id: true, position: true },
      });

      const desiredIndex = dto.position ?? existingCards.length;
      const clampedIndex = Math.max(0, Math.min(desiredIndex, existingCards.length));

      // 1) First, move all cards to temporary negative positions to avoid unique constraint conflicts
      await Promise.all(
        existingCards.map((card, idx) =>
          tx.kanbanCard.update({
            where: { id: card.id },
            data: { position: -(idx + 1) },
          }),
        ),
      );

      // 2) Create the new card at a temporary position
      const newCard = await tx.kanbanCard.create({
        data: {
          title: dto.title,
          description: dto.description,
          appointmentId: dto.appointmentId,
          leadId: dto.leadId,
          tutorId: dto.tutorId,
          position: -(existingCards.length + 1),
          columnId,
          priority: dto.priority || 'medium',
          dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
          assignedTo: dto.assignedTo,
          tags: dto.tags || [],
          metadata: dto.metadata as any,
        },
      });

      // 3) Build final positions array with new card inserted
      const cardIds = existingCards.map((c) => c.id);
      cardIds.splice(clampedIndex, 0, newCard.id);

      // 4) Assign final 1-based positions
      await Promise.all(
        cardIds.map((cardId, idx) =>
          tx.kanbanCard.update({
            where: { id: cardId },
            data: { position: idx + 1 },
          }),
        ),
      );

      return tx.kanbanCard.findUnique({
        where: { id: newCard.id },
        include: {
          appointment: dto.appointmentId ? {
            include: {
              tutor: { select: { id: true, name: true } },
              pet: { select: { id: true, name: true, species: true } },
            },
          } : false,
          lead: dto.leadId ? {
            select: { id: true, name: true, email: true, status: true, currentScore: true },
          } : false,
          tutor: dto.tutorId ? {
            select: { id: true, name: true, email: true, status: true },
          } : false,
        },
      });
    });
  }
}
