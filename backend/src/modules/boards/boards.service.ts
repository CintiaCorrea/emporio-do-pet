import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBoardDto } from './dto/create-board.dto';
import { UpdateBoardDto } from './dto/update-board.dto';

type BoardTypeExtended = 'APPOINTMENT' | 'CONSULTATION' | 'HOSPITALIZATION' | 'TASK' | 'PROJECT' | 'LEAD' | 'CLIENT' | 'SALES';

const DEFAULT_BOARD_CONFIGS: Record<string, { 
  name: string; 
  type: BoardTypeExtended; 
  color: string; 
  description: string;
  columns: { name: string; position: number; color: string }[];
}> = {
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

  async create(userId: string, createBoardDto: CreateBoardDto) {
    const boardType = createBoardDto.type || 'APPOINTMENT';
    
    let defaultColumns = [
      { name: 'A Fazer', position: 1, color: '#FF6B6B' },
      { name: 'Em Progresso', position: 2, color: '#FFD93D' },
      { name: 'Concluído', position: 3, color: '#6BCB77' },
    ];

    if (boardType === 'CONSULTATION' && DEFAULT_BOARD_CONFIGS.CONSULTATION) {
      defaultColumns = DEFAULT_BOARD_CONFIGS.CONSULTATION.columns;
    } else if (boardType === 'HOSPITALIZATION' && DEFAULT_BOARD_CONFIGS.HOSPITALIZATION) {
      defaultColumns = DEFAULT_BOARD_CONFIGS.HOSPITALIZATION.columns;
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
    await this.findById(id, userId);

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

  async ensureDefaultBoards(userId: string) {
    const results: Record<string, any> = {};

    for (const [key, config] of Object.entries(DEFAULT_BOARD_CONFIGS)) {
      const existing = await this.prisma.board.findFirst({
        where: { userId, type: config.type as any },
        include: {
          columns: { orderBy: { position: 'asc' } },
        },
      });

      if (existing) {
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

  async getConsultationBoard(userId: string) {
    return this.findByType(userId, 'CONSULTATION');
  }

  async getHospitalizationBoard(userId: string) {
    return this.findByType(userId, 'HOSPITALIZATION');
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
