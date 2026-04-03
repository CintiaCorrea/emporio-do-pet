import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBoardDto } from './dto/create-board.dto';
import { UpdateBoardDto } from './dto/update-board.dto';

type BoardTypeExtended = 'APPOINTMENT' | 'CONSULTATION' | 'HOSPITALIZATION' | 'TREATMENT' | 'TASK' | 'PROJECT' | 'LEAD' | 'CLIENT' | 'SALES';

const SYSTEM_BOARD_NAMES: ReadonlySet<string> = new Set([
  'Agendamentos',
  'Consultas',
  'Tratamentos',
  'Internações',
]);

const DEFAULT_BOARD_CONFIGS: Record<string, { 
  name: string; 
  type: BoardTypeExtended; 
  color: string; 
  description: string;
  columns: { name: string; position: number; color: string }[];
}> = {
  APPOINTMENT: {
    name: 'Agendamentos',
    type: 'APPOINTMENT',
    color: 'bg-green-500',
    description: 'Pipeline de agendamentos',
    columns: [
      { name: 'Agendada', position: 1, color: '#3B82F6' },
      { name: 'Confirmada', position: 2, color: '#F59E0B' },
      { name: 'Em Andamento', position: 3, color: '#8B5CF6' },
      { name: 'Concluída', position: 4, color: '#10B981' },
      { name: 'Cancelada', position: 5, color: '#EF4444' },
    ],
  },
  CONSULTATION: {
    name: 'Consultas',
    type: 'CONSULTATION',
    color: 'bg-blue-500',
    description: 'Pipeline de consultas veterinárias',
    columns: [
      { name: 'Agendada', position: 1, color: '#3B82F6' },
      { name: 'Aguardando', position: 2, color: '#F59E0B' },
      { name: 'Em Atendimento', position: 3, color: '#8B5CF6' },
      { name: 'Finalizada', position: 4, color: '#10B981' },
      { name: 'Cancelada', position: 5, color: '#EF4444' },
    ],
  },
  HOSPITALIZATION: {
    name: 'Internações',
    type: 'HOSPITALIZATION',
    color: 'bg-red-500',
    description: 'Pipeline de internações',
    columns: [
      { name: 'Admissão', position: 1, color: '#F59E0B' },
      { name: 'Em Tratamento', position: 2, color: '#3B82F6' },
      { name: 'Observação', position: 3, color: '#8B5CF6' },
      { name: 'Alta Programada', position: 4, color: '#10B981' },
      { name: 'Alta', position: 5, color: '#6B7280' },
    ],
  },
  TREATMENT: {
    name: 'Tratamentos',
    type: 'TREATMENT',
    color: 'bg-teal-500',
    description: 'Pipeline de tratamentos veterinários',
    columns: [
      { name: 'Pendente', position: 1, color: '#F59E0B' },
      { name: 'Em Andamento', position: 2, color: '#3B82F6' },
      { name: 'Aplicado', position: 3, color: '#8B5CF6' },
      { name: 'Concluído', position: 4, color: '#10B981' },
      { name: 'Cancelado', position: 5, color: '#EF4444' },
    ],
  },
  LEAD: {
    name: 'Pipeline de Leads',
    type: 'LEAD',
    color: 'bg-purple-500',
    description: 'Funil de conversão de leads',
    columns: [
      { name: 'Novos', position: 1, color: '#8B5CF6' },
      { name: 'Qualificando', position: 2, color: '#3B82F6' },
      { name: 'Qualificados', position: 3, color: '#10B981' },
      { name: 'Em Negociação', position: 4, color: '#F59E0B' },
      { name: 'Convertidos', position: 5, color: '#059669' },
      { name: 'Perdidos', position: 6, color: '#EF4444' },
    ],
  },
  CLIENT: {
    name: 'Gestão de Clientes',
    type: 'CLIENT',
    color: 'bg-green-500',
    description: 'Pipeline de relacionamento com clientes',
    columns: [
      { name: 'Onboarding', position: 1, color: '#3B82F6' },
      { name: 'Ativos', position: 2, color: '#10B981' },
      { name: 'Em Risco', position: 3, color: '#F59E0B' },
      { name: 'Reativação', position: 4, color: '#8B5CF6' },
      { name: 'Inativos', position: 5, color: '#6B7280' },
    ],
  },
  SALES: {
    name: 'Pipeline de Vendas',
    type: 'SALES',
    color: 'bg-amber-500',
    description: 'Funil de vendas e oportunidades',
    columns: [
      { name: 'Prospecção', position: 1, color: '#8B5CF6' },
      { name: 'Contato Inicial', position: 2, color: '#3B82F6' },
      { name: 'Proposta', position: 3, color: '#F59E0B' },
      { name: 'Negociação', position: 4, color: '#EC4899' },
      { name: 'Fechado Ganho', position: 5, color: '#10B981' },
      { name: 'Fechado Perdido', position: 6, color: '#EF4444' },
    ],
  },
};

@Injectable()
export class BoardsService {
  constructor(private readonly prisma: PrismaService) {}

  static isSystemBoard(name: string): boolean {
    return SYSTEM_BOARD_NAMES.has(name);
  }

  async create(userId: string, createBoardDto: CreateBoardDto) {
    const boardType = createBoardDto.type || 'TASK';
    
    let defaultColumns = [
      { name: 'A Fazer', position: 1, color: '#FF6B6B' },
      { name: 'Em Progresso', position: 2, color: '#FFD93D' },
      { name: 'Concluído', position: 3, color: '#6BCB77' },
    ];

    if (DEFAULT_BOARD_CONFIGS[boardType]) {
      defaultColumns = DEFAULT_BOARD_CONFIGS[boardType].columns;
    }

    return this.prisma.board.create({
      data: {
        ...createBoardDto,
        type: boardType as any,
        userId,
        columns: {
          create: defaultColumns,
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
                lead: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    phone: true,
                    status: true,
                    currentScore: true,
                    source: true,
                    tags: true,
                  },
                },
                client: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    phone: true,
                    status: true,
                    type: true,
                    totalRevenue: true,
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
    const board = await this.findById(id, userId);

    if (BoardsService.isSystemBoard(board.name)) {
      const { color, description, favorite, ...forbidden } = updateBoardDto as any;
      if (forbidden.name || forbidden.type) {
        throw new ForbiddenException(
          'Boards de sistema não podem ter nome ou tipo alterados',
        );
      }
      return this.prisma.board.update({
        where: { id },
        data: {
          ...(color !== undefined ? { color } : {}),
          ...(description !== undefined ? { description } : {}),
          ...(favorite !== undefined ? { favorite } : {}),
        },
        include: {
          columns: { orderBy: { position: 'asc' } },
        },
      });
    }

    return this.prisma.board.update({
      where: { id },
      data: {
        ...updateBoardDto,
        type: updateBoardDto.type as any,
      },
      include: {
        columns: {
          orderBy: { position: 'asc' },
        },
      },
    });
  }

  async remove(id: string, userId: string) {
    const board = await this.findById(id, userId);

    if (BoardsService.isSystemBoard(board.name)) {
      throw new ForbiddenException(
        'Boards de sistema (Agendamentos, Consultas, Tratamentos, Internações) não podem ser excluídos',
      );
    }

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

  async resetAndRecreateBoards(userId: string): Promise<Record<string, any>> {
    const userBoards = await this.prisma.board.findMany({
      where: { userId },
      select: { id: true },
    });
    const boardIds = userBoards.map((b) => b.id);

    if (boardIds.length > 0) {
      const columnIds = await this.prisma.kanbanColumn.findMany({
        where: { boardId: { in: boardIds } },
        select: { id: true },
      });
      await this.prisma.kanbanCard.deleteMany({
        where: { columnId: { in: columnIds.map((c) => c.id) } },
      });
      await this.prisma.kanbanColumn.deleteMany({
        where: { boardId: { in: boardIds } },
      });
      await this.prisma.board.deleteMany({
        where: { id: { in: boardIds } },
      });
    }

    return this.ensureDefaultBoards(userId);
  }

  async ensureDefaultBoards(userId: string): Promise<Record<string, any>> {
    // Migration: if non-system boards exist but no system boards, clean up old boards
    const allBoards = await this.prisma.board.findMany({ where: { userId }, select: { id: true, type: true, name: true } });
    const hasSystemBoard = allBoards.some((b) => SYSTEM_BOARD_NAMES.has(b.name));
    if (!hasSystemBoard && allBoards.length > 0) {
      return this.resetAndRecreateBoards(userId);
    }

    const results: Record<string, any> = {};

    const systemEntries = Object.entries(DEFAULT_BOARD_CONFIGS)
      .filter(([, cfg]) => SYSTEM_BOARD_NAMES.has(cfg.name));

    for (const [key, config] of systemEntries) {
      const existing = await this.prisma.board.findFirst({
        where: { userId, type: config.type as any },
        include: {
          columns: { orderBy: { position: 'asc' }, include: { _count: { select: { cards: true } } } },
        },
      });

      if (existing) {
        // For system boards, fix columns if they don't match the expected config
        if (BoardsService.isSystemBoard(config.name)) {
          const expectedNames = config.columns.map((c) => c.name);
          const actualNames = existing.columns.map((c: any) => c.name);
          const columnsMatch =
            expectedNames.length === actualNames.length &&
            expectedNames.every((n, i) => n === actualNames[i]);

          if (!columnsMatch) {
            const emptyOldColumns = existing.columns.filter(
              (c: any) => !expectedNames.includes(c.name) && c._count.cards === 0,
            );
            for (const col of emptyOldColumns) {
              await this.prisma.kanbanColumn.delete({ where: { id: col.id } });
            }

            // Move ALL remaining columns to very high temp positions to free up space
            const remainingCols = await this.prisma.kanbanColumn.findMany({
              where: { boardId: existing.id },
            });
            for (let i = 0; i < remainingCols.length; i++) {
              await this.prisma.kanbanColumn.update({
                where: { id: remainingCols[i].id },
                data: { position: 10000 + i },
              });
            }

            // Create missing columns at temp high positions
            let tempPos = 20000;
            for (const expectedCol of config.columns) {
              const alreadyExists = remainingCols.some(
                (c) => c.name === expectedCol.name,
              );
              if (!alreadyExists) {
                tempPos++;
                await this.prisma.kanbanColumn.create({
                  data: {
                    name: expectedCol.name,
                    position: tempPos,
                    color: expectedCol.color,
                    boardId: existing.id,
                  },
                });
              }
            }

            // Now set all expected columns to their final positions
            const allCols = await this.prisma.kanbanColumn.findMany({
              where: { boardId: existing.id },
            });
            for (const expectedCol of config.columns) {
              const col = allCols.find((c) => c.name === expectedCol.name);
              if (col) {
                await this.prisma.kanbanColumn.update({
                  where: { id: col.id },
                  data: { position: expectedCol.position },
                });
              }
            }

            const fixed = await this.prisma.board.findFirst({
              where: { id: existing.id },
              include: { columns: { orderBy: { position: 'asc' } } },
            });
            results[key] = fixed;
            continue;
          }
        }

        results[key] = existing;
      } else {
        const newBoard = await this.prisma.board.create({
          data: {
            name: config.name,
            type: config.type as any,
            color: config.color,
            description: config.description,
            userId,
            columns: {
              create: config.columns,
            },
          },
          include: {
            columns: { orderBy: { position: 'asc' } },
          },
        });
        results[key] = newBoard;
      }
    }

    return results;
  }

  async findByType(userId: string, type: BoardTypeExtended) {
    const cardIncludes = {
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
          phone: true,
          status: true,
          currentScore: true,
          source: true,
          tags: true,
        },
      },
      client: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          status: true,
          type: true,
          totalRevenue: true,
        },
      },
    };

    let board = await this.prisma.board.findFirst({
      where: { userId, type: type as any },
      include: {
        columns: {
          orderBy: { position: 'asc' },
          include: {
            cards: {
              orderBy: { position: 'asc' },
              include: cardIncludes,
            },
          },
        },
      },
    });

    if (!board && DEFAULT_BOARD_CONFIGS[type]) {
      const config = DEFAULT_BOARD_CONFIGS[type];
      board = await this.prisma.board.create({
        data: {
          name: config.name,
          type: config.type as any,
          color: config.color,
          description: config.description,
          userId,
          columns: {
            create: config.columns,
          },
        },
        include: {
          columns: {
            orderBy: { position: 'asc' },
            include: {
              cards: {
                orderBy: { position: 'asc' },
                include: cardIncludes,
              },
            },
          },
        },
      });
    }

    return board;
  }

  async getAppointmentBoard(userId: string) {
    return this.findByType(userId, 'APPOINTMENT');
  }

  async getConsultationBoard(userId: string) {
    return this.findByType(userId, 'CONSULTATION');
  }

  async getHospitalizationBoard(userId: string) {
    return this.findByType(userId, 'HOSPITALIZATION');
  }

  async getTreatmentBoard(userId: string) {
    return this.findByType(userId, 'TREATMENT');
  }

  async getLeadBoard(userId: string) {
    return this.findByType(userId, 'LEAD');
  }

  async getClientBoard(userId: string) {
    return this.findByType(userId, 'CLIENT');
  }

  async getSalesBoard(userId: string) {
    return this.findByType(userId, 'SALES');
  }

  async createCardForAppointment(
    userId: string,
    appointmentId: string,
    boardType: BoardTypeExtended,
    title: string,
    columnName?: string,
  ) {
    const board = await this.findByType(userId, boardType);
    if (!board) return null;

    const targetColumnName = columnName || board.columns[0]?.name;
    const column = board.columns.find((c) => c.name === targetColumnName) || board.columns[0];
    if (!column) return null;

    const existingCard = await this.prisma.kanbanCard.findFirst({
      where: { appointmentId },
    });
    if (existingCard) return existingCard;

    const existingCount = await this.prisma.kanbanCard.count({
      where: { columnId: column.id },
    });

    return this.prisma.kanbanCard.create({
      data: {
        title,
        appointmentId,
        columnId: column.id,
        position: existingCount + 1,
      },
      include: {
        column: { select: { id: true, name: true, color: true } },
      },
    });
  }

  async moveCardToColumn(appointmentId: string, columnName: string) {
    const card = await this.prisma.kanbanCard.findFirst({
      where: { appointmentId },
      include: {
        column: {
          include: { board: { include: { columns: true } } },
        },
      },
    });

    if (!card) return null;

    const targetColumn = card.column.board.columns.find((c) => c.name === columnName);
    if (!targetColumn || targetColumn.id === card.columnId) return card;

    const existingCount = await this.prisma.kanbanCard.count({
      where: { columnId: targetColumn.id },
    });

    return this.prisma.kanbanCard.update({
      where: { id: card.id },
      data: {
        columnId: targetColumn.id,
        position: existingCount + 1,
      },
      include: {
        column: { select: { id: true, name: true, color: true } },
      },
    });
  }

  async moveAllCardsForAppointment(
    appointmentId: string,
    consultationColumnName?: string,
    appointmentColumnName?: string,
  ) {
    const cards = await this.prisma.kanbanCard.findMany({
      where: { appointmentId },
      include: {
        column: {
          include: { board: { select: { type: true, columns: true } } },
        },
      },
    });

    const results: any[] = [];
    for (const card of cards) {
      const boardType = card.column.board.type;
      let targetColName: string | undefined;

      if (boardType === 'CONSULTATION' && consultationColumnName) {
        targetColName = consultationColumnName;
      } else if (boardType === 'APPOINTMENT' && appointmentColumnName) {
        targetColName = appointmentColumnName;
      } else {
        continue;
      }

      const targetColumn = (card.column.board as any).columns.find(
        (c: any) => c.name === targetColName,
      );
      if (!targetColumn || targetColumn.id === card.columnId) continue;

      const existingCount = await this.prisma.kanbanCard.count({
        where: { columnId: targetColumn.id },
      });

      const updated = await this.prisma.kanbanCard.update({
        where: { id: card.id },
        data: { columnId: targetColumn.id, position: existingCount + 1 },
      });
      results.push(updated);
    }

    return results;
  }

  async createCardForLead(
    userId: string,
    leadId: string,
    title: string,
    columnName?: string,
    priority?: string,
  ) {
    const board = await this.findByType(userId, 'LEAD');
    if (!board) return null;

    const targetColumnName = columnName || board.columns[0]?.name;
    const column = board.columns.find((c) => c.name === targetColumnName) || board.columns[0];
    if (!column) return null;

    const existingCard = await this.prisma.kanbanCard.findFirst({
      where: { leadId },
    });
    if (existingCard) return existingCard;

    const existingCount = await this.prisma.kanbanCard.count({
      where: { columnId: column.id },
    });

    return this.prisma.kanbanCard.create({
      data: {
        title,
        leadId,
        columnId: column.id,
        position: existingCount + 1,
        priority: priority || 'medium',
      },
      include: {
        column: { select: { id: true, name: true, color: true } },
        lead: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            status: true,
            currentScore: true,
          },
        },
      },
    });
  }

  async createCardForClient(
    userId: string,
    clientId: string,
    title: string,
    columnName?: string,
    priority?: string,
  ) {
    const board = await this.findByType(userId, 'CLIENT');
    if (!board) return null;

    const targetColumnName = columnName || board.columns[0]?.name;
    const column = board.columns.find((c) => c.name === targetColumnName) || board.columns[0];
    if (!column) return null;

    const existingCard = await this.prisma.kanbanCard.findFirst({
      where: { clientId },
    });
    if (existingCard) return existingCard;

    const existingCount = await this.prisma.kanbanCard.count({
      where: { columnId: column.id },
    });

    return this.prisma.kanbanCard.create({
      data: {
        title,
        clientId,
        columnId: column.id,
        position: existingCount + 1,
        priority: priority || 'medium',
      },
      include: {
        column: { select: { id: true, name: true, color: true } },
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            status: true,
            type: true,
          },
        },
      },
    });
  }

  async moveLeadCard(leadId: string, columnName: string) {
    const card = await this.prisma.kanbanCard.findFirst({
      where: { leadId },
      include: {
        column: {
          include: { board: { include: { columns: true } } },
        },
      },
    });

    if (!card) return null;

    const targetColumn = card.column.board.columns.find((c) => c.name === columnName);
    if (!targetColumn || targetColumn.id === card.columnId) return card;

    const existingCount = await this.prisma.kanbanCard.count({
      where: { columnId: targetColumn.id },
    });

    return this.prisma.kanbanCard.update({
      where: { id: card.id },
      data: {
        columnId: targetColumn.id,
        position: existingCount + 1,
      },
      include: {
        column: { select: { id: true, name: true, color: true } },
      },
    });
  }

  async moveClientCard(clientId: string, columnName: string) {
    const card = await this.prisma.kanbanCard.findFirst({
      where: { clientId },
      include: {
        column: {
          include: { board: { include: { columns: true } } },
        },
      },
    });

    if (!card) return null;

    const targetColumn = card.column.board.columns.find((c) => c.name === columnName);
    if (!targetColumn || targetColumn.id === card.columnId) return card;

    const existingCount = await this.prisma.kanbanCard.count({
      where: { columnId: targetColumn.id },
    });

    return this.prisma.kanbanCard.update({
      where: { id: card.id },
      data: {
        columnId: targetColumn.id,
        position: existingCount + 1,
      },
      include: {
        column: { select: { id: true, name: true, color: true } },
      },
    });
  }
}
