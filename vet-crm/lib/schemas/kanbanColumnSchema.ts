import { z } from 'zod';

// Schema base para KanbanColumn
export const kanbanColumnBaseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  position: z.number().int().min(0, "Posição não pode ser negativa"),
  color: z.string().optional().nullable(),
  boardId: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Schema para criação de KanbanColumn
export const createKanbanColumnSchema = z.object({
  name: z.string()
    .min(1, "Nome da coluna é obrigatório")
    .max(50, "Nome muito longo")
    .regex(/^[a-zA-ZÀ-ÿ0-9\s\-_]+$/, "Nome contém caracteres inválidos"),
  
  position: z.number()
    .int()
    .min(0, "Posição não pode ser negativa")
    .max(100, "Posição muito alta"),
  
  color: z.string()
    .max(7, "Cor deve ser um código hexadecimal")
    .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Cor deve ser um código hexadecimal válido")
    .optional()
    .nullable()
    .transform(val => val?.trim() || null),
  
  boardId: z.string().uuid("ID do board inválido"),
});

// Schema para criação múltipla de KanbanColumns
export const createMultipleKanbanColumnsSchema = z.object({
  boardId: z.string().uuid("ID do board inválido"),
  columns: z.array(createKanbanColumnSchema.omit({ boardId: true }))
    .min(1, "Pelo menos uma coluna é necessária")
    .max(20, "Máximo de 20 colunas por board"),
});

// Schema para atualização de KanbanColumn
export const updateKanbanColumnSchema = createKanbanColumnSchema.partial().extend({
  id: z.string().uuid("ID da coluna inválido"),
});

// Schema para resposta da API (inclui relacionamentos)
export const kanbanColumnResponseSchema = kanbanColumnBaseSchema.extend({
  board: z.object({
    id: z.string().uuid(),
    name: z.string(),
    type: z.enum(['APPOINTMENT', 'TASK', 'PROJECT']),
  }),
  
  cards: z.array(z.object({
    id: z.string().uuid(),
    title: z.string(),
    description: z.string().optional().nullable(),
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
    updatedAt: z.date(),
  })).default([]),
  
  _count: z.object({
    cards: z.number().int().min(0),
  }).optional(),
});

// Schema para listagem de kanbanColumns (com paginação)
export const kanbanColumnListResponseSchema = z.object({
  columns: z.array(kanbanColumnResponseSchema),
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
export const kanbanColumnQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().max(100).optional().default(''),
  boardId: z.string().uuid().optional(),
  includeCards: z.coerce.boolean().default(false),
  includeBoard: z.coerce.boolean().default(true),
  sortBy: z.enum(["name", "position", "createdAt", "updatedAt"]).default("position"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
});

// Schema para validação de parâmetros de rota
export const kanbanColumnParamsSchema = z.object({
  id: z.string().uuid("ID da coluna inválido"),
});

// Schema para resposta de erro
export const kanbanColumnErrorSchema = z.object({
  error: z.string(),
  details: z.array(z.object({
    field: z.string().optional(),
    message: z.string(),
  })).optional(),
  code: z.string().optional(),
});

// Schema para estatísticas da coluna
export const kanbanColumnStatsSchema = z.object({
  total: z.number().int().min(0),
  totalCards: z.number().int().min(0),
  averageCardsPerColumn: z.number().min(0),
  maxCardsInColumn: z.number().int().min(0),
  minCardsInColumn: z.number().int().min(0),
});

// Schema para mover coluna entre posições
export const moveKanbanColumnSchema = z.object({
  columnId: z.string().uuid("ID da coluna inválido"),
  newPosition: z.number().int().min(0, "Posição não pode ser negativa"),
});

// Schema para atualização de cor da coluna
export const updateKanbanColumnColorSchema = z.object({
  id: z.string().uuid("ID da coluna inválido"),
  color: z.string()
    .max(7, "Cor deve ser um código hexadecimal")
    .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Cor deve ser um código hexadecimal válido")
    .optional()
    .nullable(),
});

// Types derivados dos schemas
export type KanbanColumnBase = z.infer<typeof kanbanColumnBaseSchema>;
export type CreateKanbanColumnInput = z.infer<typeof createKanbanColumnSchema>;
export type CreateMultipleKanbanColumnsInput = z.infer<typeof createMultipleKanbanColumnsSchema>;
export type UpdateKanbanColumnInput = z.infer<typeof updateKanbanColumnSchema>;
export type KanbanColumnResponse = z.infer<typeof kanbanColumnResponseSchema>;
export type KanbanColumnListResponse = z.infer<typeof kanbanColumnListResponseSchema>;
export type KanbanColumnQuery = z.infer<typeof kanbanColumnQuerySchema>;
export type KanbanColumnParams = z.infer<typeof kanbanColumnParamsSchema>;
export type KanbanColumnError = z.infer<typeof kanbanColumnErrorSchema>;
export type KanbanColumnStats = z.infer<typeof kanbanColumnStatsSchema>;
export type MoveKanbanColumnInput = z.infer<typeof moveKanbanColumnSchema>;
export type UpdateKanbanColumnColorInput = z.infer<typeof updateKanbanColumnColorSchema>;

// Utilitários para validação
export const validateCreateKanbanColumn = (data: unknown): CreateKanbanColumnInput => {
  return createKanbanColumnSchema.parse(data);
};

export const validateCreateMultipleKanbanColumns = (data: unknown): CreateMultipleKanbanColumnsInput => {
  return createMultipleKanbanColumnsSchema.parse(data);
};

export const validateUpdateKanbanColumn = (data: unknown): UpdateKanbanColumnInput => {
  return updateKanbanColumnSchema.parse(data);
};

export const validateKanbanColumnQuery = (data: unknown): KanbanColumnQuery => {
  return kanbanColumnQuerySchema.parse(data);
};

export const validateKanbanColumnParams = (data: unknown): KanbanColumnParams => {
  return kanbanColumnParamsSchema.parse(data);
};

export const validateMoveKanbanColumn = (data: unknown): MoveKanbanColumnInput => {
  return moveKanbanColumnSchema.parse(data);
};

export const validateUpdateKanbanColumnColor = (data: unknown): UpdateKanbanColumnColorInput => {
  return updateKanbanColumnColorSchema.parse(data);
};

// Função para formatar erros de validação
export const formatKanbanColumnValidationError = (error: z.ZodError): KanbanColumnError => {
  return {
    error: "Dados de entrada inválidos",
    details: error.issues.map(issue => ({
      field: issue.path.join('.'),
      message: issue.message,
    })),
    code: "VALIDATION_ERROR",
  };
};

// Função para sanitizar dados da coluna
export const sanitizeKanbanColumnInput = (input: CreateKanbanColumnInput | UpdateKanbanColumnInput): CreateKanbanColumnInput | UpdateKanbanColumnInput => {
  const sanitized: Partial<CreateKanbanColumnInput | UpdateKanbanColumnInput> = {};
  
  if ('name' in input && input.name !== undefined) {
    sanitized.name = input.name.trim();
  }
  
  if ('position' in input && input.position !== undefined) {
    sanitized.position = input.position;
  }
  
  if ('color' in input && input.color !== undefined) {
    sanitized.color = input.color?.trim() || null;
  }
  
  if ('boardId' in input && input.boardId !== undefined) {
    sanitized.boardId = input.boardId;
  }
  
  if ('id' in input && input.id !== undefined) {
    (sanitized as UpdateKanbanColumnInput).id = input.id;
  }
  
  return { ...input, ...sanitized } as CreateKanbanColumnInput | UpdateKanbanColumnInput;
};

// Interface para dados da coluna do banco
interface DatabaseKanbanColumn {
  id: string;
  name: string;
  position: number;
  color: string | null;
  boardId: string;
  createdAt: Date;
  updatedAt: Date;
  board: {
    id: string;
    name: string;
    type: string;
  };
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
    updatedAt: Date;
  }>;
  _count?: {
    cards: number;
  };
}

// Interface para filtros do Prisma
interface KanbanColumnFilters {
  OR?: Array<{
    name?: { contains: string; mode: 'insensitive' };
  }>;
  boardId?: string;
}

// Interface para opções de include do Prisma
interface KanbanColumnIncludeOptions {
  board: {
    select: {
      id: boolean;
      name: boolean;
      type: boolean;
    };
  };
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
      updatedAt: boolean;
    };
    orderBy: {
      position: 'asc';
    };
  };
  _count: {
    select: {
      cards: boolean;
    };
  };
}

// Função para gerar resposta padrão da coluna
export const formatKanbanColumnResponse = (column: DatabaseKanbanColumn): KanbanColumnResponse => {
  return {
    id: column.id,
    name: column.name,
    position: column.position,
    color: column.color,
    boardId: column.boardId,
    createdAt: column.createdAt,
    updatedAt: column.updatedAt,
    board: {
      id: column.board.id,
      name: column.board.name,
      type: column.board.type as 'APPOINTMENT' | 'TASK' | 'PROJECT',
    },
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
      updatedAt: card.updatedAt,
    })),
    _count: column._count,
  };
};

// Função para obter cor padrão baseada na posição
export const getDefaultColumnColor = (position: number): string => {
  const defaultColors = [
    '#3B82F6', // blue
    '#10B981', // green
    '#F59E0B', // amber
    '#EF4444', // red
    '#8B5CF6', // violet
    '#EC4899', // pink
    '#06B6D4', // cyan
    '#84CC16', // lime
    '#F97316', // orange
    '#6366F1', // indigo
  ];
  
  return defaultColors[position % defaultColors.length];
};

// Função para obter cor de texto contrastante
export const getContrastTextColor = (backgroundColor: string): string => {
  // Remove o # do início
  const hex = backgroundColor.replace('#', '');
  
  // Converte para RGB
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  // Calcula o brilho (fórmula de luminosidade)
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  
  // Retorna preto para fundos claros, branco para fundos escuros
  return brightness > 128 ? '#000000' : '#FFFFFF';
};

// Função para validar se a coluna pode ser deletada
export const canDeleteKanbanColumn = (column: KanbanColumnResponse): boolean => {
  return column.cards.length === 0;
};

// Função para calcular WIP (Work In Progress) limit
export const calculateWIPLimit = (column: KanbanColumnResponse, wipLimit?: number): {
  current: number;
  limit: number | null;
  isOverLimit: boolean;
} => {
  const current = column.cards.length;
  const limit = wipLimit || null;
  const isOverLimit = limit !== null && current > limit;
  
  return {
    current,
    limit,
    isOverLimit,
  };
};

// Função para obter ícone baseado no nome da coluna
export const getColumnIcon = (columnName: string): string => {
  const iconMap: Record<string, string> = {
    'agendados': '📅',
    'confirmados': '✅',
    'em andamento': '⚡',
    'concluídos': '🎯',
    'cancelados': '❌',
    'a fazer': '📝',
    'em progresso': '🔄',
    'em revisão': '👀',
    'backlog': '📚',
    'planejamento': '📊',
    'desenvolvimento': '💻',
    'testes': '🧪',
    'concluído': '🏁',
  };
  
  const lowerName = columnName.toLowerCase();
  return iconMap[lowerName] || '📋';
};

// Função para validar posição única no board
export const validateUniquePosition = (
  columns: Array<{ id: string; position: number }>,
  position: number,
  excludeColumnId?: string
): boolean => {
  return !columns.some(column => 
    column.position === position && column.id !== excludeColumnId
  );
};

// Constants para validação
export const KANBAN_COLUMN_CONSTANTS = {
  NAME: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 50,
  },
  POSITION: {
    MIN: 0,
    MAX: 100,
  },
  COLOR: {
    MAX_LENGTH: 7,
  },
  CARDS: {
    MAX_PER_COLUMN: 100,
    WIP_LIMIT_DEFAULT: 10,
  },
} as const;

// Função auxiliar para criar query de colunas
export const createKanbanColumnQuery = (params: Partial<KanbanColumnQuery> = {}): KanbanColumnQuery => {
  const defaultQuery: KanbanColumnQuery = {
    page: 1,
    limit: 10,
    search: '',
    boardId: undefined,
    includeCards: false,
    includeBoard: true,
    sortBy: 'position',
    sortOrder: 'asc',
  };

  return { ...defaultQuery, ...params };
};

// Função para criar filtros de busca para o Prisma
export const createKanbanColumnFilters = (query: KanbanColumnQuery): KanbanColumnFilters => {
  const filters: KanbanColumnFilters = {};
  
  if (query.search) {
    filters.OR = [
      { name: { contains: query.search, mode: 'insensitive' } },
    ];
  }
  
  if (query.boardId) {
    filters.boardId = query.boardId;
  }
  
  return filters;
};

// Função para criar opções de ordenação para o Prisma
export const createKanbanColumnOrderBy = (query: KanbanColumnQuery): Record<string, 'asc' | 'desc'> => {
  const orderBy: Record<string, 'asc' | 'desc'> = {};
  
  switch (query.sortBy) {
    case 'name':
      orderBy.name = query.sortOrder;
      break;
    case 'position':
      orderBy.position = query.sortOrder;
      break;
    case 'createdAt':
      orderBy.createdAt = query.sortOrder;
      break;
    case 'updatedAt':
      orderBy.updatedAt = query.sortOrder;
      break;
    default:
      orderBy.position = 'asc';
  }
  
  return orderBy;
};

// Função para criar opções de include para o Prisma
export const createKanbanColumnInclude = (query: KanbanColumnQuery): KanbanColumnIncludeOptions => {
  const include: KanbanColumnIncludeOptions = {
    board: {
      select: {
        id: true,
        name: true,
        type: true,
      },
    },
    _count: {
      select: {
        cards: true,
      },
    },
  };

  if (query.includeCards) {
    include.cards = {
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
        updatedAt: true,
      },
      orderBy: {
        position: 'asc',
      },
    };
  }

  return include;
};

// Função para criar seleção básica da coluna
export const createKanbanColumnSelect = () => {
  return {
    id: true,
    name: true,
    position: true,
    color: true,
    boardId: true,
    createdAt: true,
    updatedAt: true,
  };
};

// Função para gerar posições sequenciais para múltiplas colunas
export const generateColumnPositions = (count: number, start: number = 0): number[] => {
  return Array.from({ length: count }, (_, i) => start + i);
};

// Função para ajustar posições após deleção
export const adjustPositionsAfterDelete = (
  columns: Array<{ id: string; position: number }>,
  deletedPosition: number
): Array<{ id: string; position: number }> => {
  return columns
    .filter(col => col.position > deletedPosition)
    .map(col => ({
      id: col.id,
      position: col.position - 1,
    }));
};
