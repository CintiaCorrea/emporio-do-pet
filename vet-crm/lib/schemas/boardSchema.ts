import { z } from 'zod';

// Enums correspondentes ao Prisma
export const BoardType = {
  APPOINTMENT: 'APPOINTMENT',
  CONSULTATION: 'CONSULTATION',
  HOSPITALIZATION: 'HOSPITALIZATION',
  TASK: 'TASK',
  PROJECT: 'PROJECT',
  LEAD: 'LEAD',
  CLIENT: 'CLIENT',
  SALES: 'SALES',
} as const;

export const boardTypeSchema = z.enum([
  'APPOINTMENT',
  'CONSULTATION',
  'HOSPITALIZATION',
  'TASK',
  'PROJECT',
  'LEAD',
  'CLIENT',
  'SALES',
]);

// Schema base para Board
export const boardBaseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  type: boardTypeSchema,
  description: z.string().optional().nullable(),
  userId: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Schema para criação de Board
export const createBoardSchema = z.object({
  name: z.string()
    .min(1, "Nome do board é obrigatório")
    .max(100, "Nome muito longo")
    .regex(/^[a-zA-ZÀ-ÿ0-9\s\-_]+$/, "Nome contém caracteres inválidos"),
  
  type: boardTypeSchema.default('APPOINTMENT'),
  
  description: z.string()
    .max(500, "Descrição muito longa")
    .optional()
    .nullable()
    .transform(val => val?.trim() || null),
  
  userId: z.string().uuid("ID do usuário inválido"),
  
  // Colunas padrão baseadas no tipo de board
  createDefaultColumns: z.boolean().default(true),
});

// Schema para criação de Board com colunas
export const createBoardWithColumnsSchema = createBoardSchema.extend({
  columns: z.array(z.object({
    name: z.string().min(1, "Nome da coluna é obrigatório").max(50, "Nome muito longo"),
    position: z.number().int().min(0, "Posição não pode ser negativa"),
    color: z.string().max(7).optional().nullable(),
  }))
  .min(1, "Pelo menos uma coluna é necessária")
  .max(10, "Máximo de 10 colunas por board"),
});

// Schema para atualização de Board
export const updateBoardSchema = createBoardSchema.partial().extend({
  id: z.string().uuid("ID do board inválido"),
});

// Schema para resposta da API (inclui relacionamentos)
export const boardResponseSchema = boardBaseSchema.extend({
  user: z.object({
    id: z.string().uuid(),
    name: z.string().nullable(),
    email: z.string().email(),
    role: z.enum(['ADMIN', 'VETERINARIAN', 'RECEPTIONIST']),
  }),
  
  columns: z.array(z.object({
    id: z.string().uuid(),
    name: z.string(),
    position: z.number().int().min(0),
    color: z.string().nullable(),
    cards: z.array(z.object({
      id: z.string().uuid(),
      title: z.string(),
      description: z.string().nullable(),
      position: z.number().int().min(0),
      appointment: z.object({
        id: z.string().uuid(),
        date: z.date(),
        status: z.enum(["SCHEDULED", "COMPLETED", "CANCELED", "CONFIRMED", "IN_PROGRESS"]),
        pet: z.object({
          name: z.string(),
          species: z.string(),
        }),
        client: z.object({
          name: z.string(),
        }),
      }).optional().nullable(),
      createdAt: z.date(),
    })).default([]),
    createdAt: z.date(),
    updatedAt: z.date(),
  })).default([]),
  
  _count: z.object({
    columns: z.number().int().min(0),
    cards: z.number().int().min(0),
  }).optional(),
});

// Schema para listagem de boards (com paginação)
export const boardListResponseSchema = z.object({
  boards: z.array(boardResponseSchema),
  pagination: z.object({
    page: z.number().int().min(1),
    limit: z.number().int().min(1),
    total: z.number().int().min(0),
    totalPages: z.number().int().min(0),
    hasNext: z.boolean(),
    hasPrev: z.boolean(),
  }),
});

// Schema para query parameters de listagem
export const boardQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().max(100).optional().default(''),
  type: boardTypeSchema.optional(),
  userId: z.string().uuid().optional(),
  includeColumns: z.coerce.boolean().default(false),
  includeCards: z.coerce.boolean().default(false),
  sortBy: z.enum(["name", "type", "createdAt", "updatedAt"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

// Schema para validação de parâmetros de rota
export const boardParamsSchema = z.object({
  id: z.string().uuid("ID do board inválido"),
});

// Schema para resposta de erro
export const boardErrorSchema = z.object({
  error: z.string(),
  details: z.array(z.object({
    field: z.string().optional(),
    message: z.string(),
  })).optional(),
  code: z.string().optional(),
});

// Schema para estatísticas do board
export const boardStatsSchema = z.object({
  total: z.number().int().min(0),
  byType: z.record(z.string(), z.number().int().min(0)),
  totalCards: z.number().int().min(0),
  averageCardsPerBoard: z.number().min(0),
});

// Schema para mover card entre colunas
export const moveCardSchema = z.object({
  cardId: z.string().uuid("ID do card inválido"),
  sourceColumnId: z.string().uuid("ID da coluna de origem inválido"),
  targetColumnId: z.string().uuid("ID da coluna de destino inválido"),
  newPosition: z.number().int().min(0, "Posição não pode ser negativa"),
});

// Schema para reordenar cards
export const reorderCardsSchema = z.object({
  columnId: z.string().uuid("ID da coluna inválido"),
  cardOrders: z.array(z.object({
    cardId: z.string().uuid("ID do card inválido"),
    position: z.number().int().min(0, "Posição não pode ser negativa"),
  }))
  .min(1, "Pelo menos um card é necessário"),
});

// Schema para reordenar colunas
export const reorderColumnsSchema = z.object({
  boardId: z.string().uuid("ID do board inválido"),
  columnOrders: z.array(z.object({
    columnId: z.string().uuid("ID da coluna inválido"),
    position: z.number().int().min(0, "Posição não pode ser negativa"),
  }))
  .min(1, "Pelo menos uma coluna é necessária"),
});

// Types derivados dos schemas
export type BoardBase = z.infer<typeof boardBaseSchema>;
export type CreateBoardInput = z.infer<typeof createBoardSchema>;
export type CreateBoardWithColumnsInput = z.infer<typeof createBoardWithColumnsSchema>;
export type UpdateBoardInput = z.infer<typeof updateBoardSchema>;
export type BoardResponse = z.infer<typeof boardResponseSchema>;
export type BoardListResponse = z.infer<typeof boardListResponseSchema>;
export type BoardQuery = z.infer<typeof boardQuerySchema>;
export type BoardParams = z.infer<typeof boardParamsSchema>;
export type BoardError = z.infer<typeof boardErrorSchema>;
export type BoardStats = z.infer<typeof boardStatsSchema>;
export type MoveCardInput = z.infer<typeof moveCardSchema>;
export type ReorderCardsInput = z.infer<typeof reorderCardsSchema>;
export type ReorderColumnsInput = z.infer<typeof reorderColumnsSchema>;
export type BoardType = z.infer<typeof boardTypeSchema>;

// Utilitários para validação
export const validateCreateBoard = (data: unknown): CreateBoardInput => {
  return createBoardSchema.parse(data);
};

export const validateCreateBoardWithColumns = (data: unknown): CreateBoardWithColumnsInput => {
  return createBoardWithColumnsSchema.parse(data);
};

export const validateUpdateBoard = (data: unknown): UpdateBoardInput => {
  return updateBoardSchema.parse(data);
};

export const validateBoardQuery = (data: unknown): BoardQuery => {
  return boardQuerySchema.parse(data);
};

export const validateBoardParams = (data: unknown): BoardParams => {
  return boardParamsSchema.parse(data);
};

export const validateMoveCard = (data: unknown): MoveCardInput => {
  return moveCardSchema.parse(data);
};

export const validateReorderCards = (data: unknown): ReorderCardsInput => {
  return reorderCardsSchema.parse(data);
};

export const validateReorderColumns = (data: unknown): ReorderColumnsInput => {
  return reorderColumnsSchema.parse(data);
};

// Função para formatar erros de validação
export const formatBoardValidationError = (error: z.ZodError): BoardError => {
  return {
    error: "Dados de entrada inválidos",
    details: error.issues.map(issue => ({
      field: issue.path.join('.'),
      message: issue.message,
    })),
    code: "VALIDATION_ERROR",
  };
};

// Função para sanitizar dados do board
export const sanitizeBoardInput = (input: CreateBoardInput | UpdateBoardInput): CreateBoardInput | UpdateBoardInput => {
  const sanitized: Partial<CreateBoardInput | UpdateBoardInput> = {};
  
  if ('name' in input && input.name !== undefined) {
    sanitized.name = input.name.trim();
  }
  
  if ('description' in input && input.description !== undefined) {
    sanitized.description = input.description?.trim() || null;
  }
  
  if ('type' in input && input.type !== undefined) {
    sanitized.type = input.type;
  }
  
  if ('userId' in input && input.userId !== undefined) {
    sanitized.userId = input.userId;
  }
  
  if ('createDefaultColumns' in input && input.createDefaultColumns !== undefined) {
    sanitized.createDefaultColumns = input.createDefaultColumns;
  }
  
  if ('id' in input && input.id !== undefined) {
    (sanitized as UpdateBoardInput).id = input.id;
  }
  
  return { ...input, ...sanitized } as CreateBoardInput | UpdateBoardInput;
};

// Interface para dados do board do banco
interface DatabaseBoard {
  id: string;
  name: string;
  type: string;
  description: string | null;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    name: string | null;
    email: string;
    role: string;
  };
  columns?: Array<{
    id: string;
    name: string;
    position: number;
    color: string | null;
    cards?: Array<{
      id: string;
      title: string;
      description: string | null;
      position: number;
      appointment?: {
        id: string;
        date: Date;
        status: string;
        pet: {
          name: string;
          species: string;
        };
        client: {
          name: string;
        };
      } | null;
      createdAt: Date;
    }>;
    createdAt: Date;
    updatedAt: Date;
  }>;
  _count?: {
    columns: number;
    cards: number;
  };
}

// Interface para filtros do Prisma
interface BoardFilters {
  OR?: Array<{
    name?: { contains: string; mode: 'insensitive' };
    description?: { contains: string; mode: 'insensitive' };
  }>;
  type?: string;
  userId?: string;
}

// Interface para opções de include do Prisma
interface BoardIncludeOptions {
  user: {
    select: {
      id: boolean;
      name: boolean;
      email: boolean;
      role: boolean;
    };
  };
  columns?: {
    select: {
      id: boolean;
      name: boolean;
      position: boolean;
      color: boolean;
      cards?: {
        select: {
          id: boolean;
          title: boolean;
          description: boolean;
          position: boolean;
          appointment?: {
            select: {
              id: boolean;
              date: boolean;
              status: boolean;
              pet: {
                select: {
                  name: boolean;
                  species: boolean;
                };
              };
              client: {
                select: {
                  name: boolean;
                };
              };
            };
          };
          createdAt: boolean;
        };
        orderBy: {
          position: 'asc';
        };
      };
      createdAt: boolean;
      updatedAt: boolean;
    };
    orderBy: {
      position: 'asc';
    };
  };
  _count: {
    select: {
      columns: boolean;
      cards: boolean;
    };
  };
}

// Função para gerar resposta padrão do board
export const formatBoardResponse = (board: DatabaseBoard): BoardResponse => {
  return {
    id: board.id,
    name: board.name,
    type: board.type as BoardType,
    description: board.description,
    userId: board.userId,
    createdAt: board.createdAt,
    updatedAt: board.updatedAt,
    user: {
      id: board.user.id,
      name: board.user.name,
      email: board.user.email,
      role: board.user.role as 'ADMIN' | 'VETERINARIAN' | 'RECEPTIONIST',
    },
    columns: (board.columns || []).map(column => ({
      id: column.id,
      name: column.name,
      position: column.position,
      color: column.color,
      cards: (column.cards || []).map(card => ({
        id: card.id,
        title: card.title,
        description: card.description,
        position: card.position,
        appointment: card.appointment ? {
          id: card.appointment.id,
          date: card.appointment.date,
          status: card.appointment.status as "SCHEDULED" | "COMPLETED" | "CANCELED" | "CONFIRMED" | "IN_PROGRESS",
          pet: {
            name: card.appointment.pet.name,
            species: card.appointment.pet.species,
          },
          client: {
            name: card.appointment.client.name,
          },
        } : undefined,
        createdAt: card.createdAt,
      })),
      createdAt: column.createdAt,
      updatedAt: column.updatedAt,
    })),
    _count: board._count,
  };
};

// Função para obter colunas padrão baseadas no tipo de board
export const getDefaultColumns = (boardType: BoardType): Array<{ name: string; position: number; color?: string }> => {
  const defaultColumns = {
    APPOINTMENT: [
      { name: 'Agendados', position: 0, color: '#3B82F6' },
      { name: 'Confirmados', position: 1, color: '#10B981' },
      { name: 'Em Andamento', position: 2, color: '#F59E0B' },
      { name: 'Concluídos', position: 3, color: '#6B7280' },
      { name: 'Cancelados', position: 4, color: '#EF4444' },
    ],
    CONSULTATION: [
      { name: 'Agendada', position: 0, color: '#3B82F6' },
      { name: 'Aguardando', position: 1, color: '#F59E0B' },
      { name: 'Em Atendimento', position: 2, color: '#8B5CF6' },
      { name: 'Finalizada', position: 3, color: '#10B981' },
      { name: 'Cancelada', position: 4, color: '#EF4444' },
    ],
    HOSPITALIZATION: [
      { name: 'Admissão', position: 0, color: '#F59E0B' },
      { name: 'Em Tratamento', position: 1, color: '#3B82F6' },
      { name: 'Observação', position: 2, color: '#8B5CF6' },
      { name: 'Alta Programada', position: 3, color: '#10B981' },
      { name: 'Alta', position: 4, color: '#6B7280' },
    ],
    TASK: [
      { name: 'A Fazer', position: 0, color: '#3B82F6' },
      { name: 'Em Progresso', position: 1, color: '#F59E0B' },
      { name: 'Em Revisão', position: 2, color: '#8B5CF6' },
      { name: 'Concluído', position: 3, color: '#10B981' },
    ],
    PROJECT: [
      { name: 'Backlog', position: 0, color: '#6B7280' },
      { name: 'Planejamento', position: 1, color: '#3B82F6' },
      { name: 'Em Desenvolvimento', position: 2, color: '#F59E0B' },
      { name: 'Testes', position: 3, color: '#8B5CF6' },
      { name: 'Concluído', position: 4, color: '#10B981' },
    ],
    LEAD: [
      { name: 'Novos', position: 0, color: '#8B5CF6' },
      { name: 'Qualificando', position: 1, color: '#3B82F6' },
      { name: 'Qualificados', position: 2, color: '#10B981' },
      { name: 'Em Negociação', position: 3, color: '#F59E0B' },
      { name: 'Convertidos', position: 4, color: '#059669' },
      { name: 'Perdidos', position: 5, color: '#EF4444' },
    ],
    CLIENT: [
      { name: 'Onboarding', position: 0, color: '#3B82F6' },
      { name: 'Ativos', position: 1, color: '#10B981' },
      { name: 'Em Risco', position: 2, color: '#F59E0B' },
      { name: 'Reativação', position: 3, color: '#8B5CF6' },
      { name: 'Inativos', position: 4, color: '#6B7280' },
    ],
    SALES: [
      { name: 'Prospecção', position: 0, color: '#8B5CF6' },
      { name: 'Contato Inicial', position: 1, color: '#3B82F6' },
      { name: 'Proposta', position: 2, color: '#F59E0B' },
      { name: 'Negociação', position: 3, color: '#EC4899' },
      { name: 'Fechado Ganho', position: 4, color: '#10B981' },
      { name: 'Fechado Perdido', position: 5, color: '#EF4444' },
    ],
  };

  return defaultColumns[boardType] || defaultColumns.APPOINTMENT;
};

// Função para obter ícone baseado no tipo de board
export const getBoardTypeIcon = (boardType: BoardType): string => {
  const icons = {
    APPOINTMENT: '📅',
    CONSULTATION: '🩺',
    HOSPITALIZATION: '🏥',
    TASK: '✅',
    PROJECT: '📋',
    LEAD: '🎯',
    CLIENT: '👥',
    SALES: '💰',
  };
  return icons[boardType];
};

// Função para obter cor baseada no tipo de board
export const getBoardTypeColor = (boardType: BoardType): string => {
  const colors = {
    APPOINTMENT: 'blue',
    CONSULTATION: 'sky',
    HOSPITALIZATION: 'red',
    TASK: 'green',
    PROJECT: 'purple',
    LEAD: 'violet',
    CLIENT: 'emerald',
    SALES: 'amber',
  };
  return colors[boardType];
};

// Função para calcular estatísticas do board
export const calculateBoardStats = (board: BoardResponse) => {
  const totalCards = board.columns.reduce((sum, column) => sum + column.cards.length, 0);
  const cardsByColumn = board.columns.map(column => ({
    columnName: column.name,
    count: column.cards.length,
  }));

  return {
    totalCards,
    cardsByColumn,
    columnCount: board.columns.length,
  };
};

// Função para verificar se o board pode ser deletado
export const canDeleteBoard = (board: BoardResponse): boolean => {
  const totalCards = board.columns.reduce((sum, column) => sum + column.cards.length, 0);
  return totalCards === 0;
};

// Constants para validação
export const BOARD_CONSTANTS = {
  NAME: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 100,
  },
  DESCRIPTION: {
    MAX_LENGTH: 500,
  },
  COLUMNS: {
    MIN: 1,
    MAX: 10,
  },
  CARDS: {
    MAX_PER_COLUMN: 100,
  },
} as const;

// Função auxiliar para criar query de boards
export const createBoardQuery = (params: Partial<BoardQuery> = {}): BoardQuery => {
  const defaultQuery: BoardQuery = {
    page: 1,
    limit: 10,
    search: '',
    type: undefined,
    userId: undefined,
    includeColumns: false,
    includeCards: false,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  };

  return { ...defaultQuery, ...params };
};

// Função para criar filtros de busca para o Prisma
export const createBoardFilters = (query: BoardQuery): BoardFilters => {
  const filters: BoardFilters = {};
  
  if (query.search) {
    filters.OR = [
      { name: { contains: query.search, mode: 'insensitive' } },
      { description: { contains: query.search, mode: 'insensitive' } },
    ];
  }
  
  if (query.type) {
    filters.type = query.type;
  }
  
  if (query.userId) {
    filters.userId = query.userId;
  }
  
  return filters;
};

// Função para criar opções de ordenação para o Prisma
export const createBoardOrderBy = (query: BoardQuery): Record<string, 'asc' | 'desc'> => {
  const orderBy: Record<string, 'asc' | 'desc'> = {};
  
  switch (query.sortBy) {
    case 'name':
      orderBy.name = query.sortOrder;
      break;
    case 'type':
      orderBy.type = query.sortOrder;
      break;
    case 'createdAt':
      orderBy.createdAt = query.sortOrder;
      break;
    case 'updatedAt':
      orderBy.updatedAt = query.sortOrder;
      break;
    default:
      orderBy.createdAt = 'desc';
  }
  
  return orderBy;
};

// Função para criar opções de include para o Prisma
export const createBoardInclude = (query: BoardQuery): BoardIncludeOptions => {
  const include: BoardIncludeOptions = {
    user: {
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    },
    _count: {
      select: {
        columns: true,
        cards: true,
      },
    },
  };

  if (query.includeColumns) {
    include.columns = {
      select: {
        id: true,
        name: true,
        position: true,
        color: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        position: 'asc',
      },
    };

    if (query.includeCards) {
      include.columns.select.cards = {
        select: {
          id: true,
          title: true,
          description: true,
          position: true,
          appointment: {
            select: {
              id: true,
              date: true,
              status: true,
              pet: {
                select: {
                  name: true,
                  species: true,
                },
              },
              client: {
                select: {
                  name: true,
                },
              },
            },
          },
          createdAt: true,
        },
        orderBy: {
          position: 'asc',
        },
      };
    }
  }

  return include;
};

// Função para criar seleção básica do board
export const createBoardSelect = () => {
  return {
    id: true,
    name: true,
    type: true,
    description: true,
    userId: true,
    createdAt: true,
    updatedAt: true,
  };
};

// Função para validar posições únicas em colunas
export const validateUniquePositions = (items: Array<{ position: number }>): boolean => {
  const positions = items.map(item => item.position);
  return new Set(positions).size === positions.length;
};

// Função para gerar posições sequenciais
export const generateSequentialPositions = (count: number, start: number = 0): number[] => {
  return Array.from({ length: count }, (_, i) => start + i);
};
