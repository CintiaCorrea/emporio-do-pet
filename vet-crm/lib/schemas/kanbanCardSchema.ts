import { z } from 'zod';

// Schema base para KanbanCard
export const kanbanCardBaseSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string().optional().nullable(),
  position: z.number().int().min(0, "Posição não pode ser negativa"),
  columnId: z.string().uuid(),
  appointmentId: z.string().uuid().optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Schema para criação de KanbanCard
export const createKanbanCardSchema = z.object({
  title: z.string()
    .min(1, "Título do card é obrigatório")
    .max(200, "Título muito longo")
    .regex(/^[a-zA-ZÀ-ÿ0-9\s\-_.,!?()]+$/, "Título contém caracteres inválidos"),
  
  description: z.string()
    .max(1000, "Descrição muito longa")
    .optional()
    .nullable()
    .transform(val => val?.trim() || null),
  
  position: z.number()
    .int()
    .min(0, "Posição não pode ser negativa")
    .max(1000, "Posição muito alta"),
  
  columnId: z.string().uuid("ID da coluna inválido"),
  
  appointmentId: z.string()
    .uuid("ID do agendamento inválido")
    .optional()
    .nullable()
    .transform(val => val?.trim() || null),
  
  metadata: z.record(z.string(), z.unknown())
    .optional()
    .nullable()
    .refine(val => !val || Object.keys(val).length <= 10, {
      message: "Metadata não pode ter mais de 10 propriedades"
    }),
});

// Schema para criação de KanbanCard a partir de Appointment
export const createKanbanCardFromAppointmentSchema = z.object({
  appointmentId: z.string().uuid("ID do agendamento inválido"),
  columnId: z.string().uuid("ID da coluna inválido"),
  position: z.number().int().min(0, "Posição não pode ser negativa").optional(),
});

// Schema para criação múltipla de KanbanCards
export const createMultipleKanbanCardsSchema = z.object({
  columnId: z.string().uuid("ID da coluna inválido"),
  cards: z.array(createKanbanCardSchema.omit({ columnId: true }))
    .min(1, "Pelo menos um card é necessário")
    .max(50, "Máximo de 50 cards por vez"),
});

// Schema para atualização de KanbanCard
export const updateKanbanCardSchema = createKanbanCardSchema.partial().extend({
  id: z.string().uuid("ID do card inválido"),
});

// Schema para resposta da API (inclui relacionamentos)
export const kanbanCardResponseSchema = kanbanCardBaseSchema.extend({
  column: z.object({
    id: z.string().uuid(),
    name: z.string(),
    position: z.number().int().min(0),
    color: z.string().nullable(),
    board: z.object({
      id: z.string().uuid(),
      name: z.string(),
      type: z.enum(['APPOINTMENT', 'TASK', 'PROJECT']),
    }),
  }),
  
  appointment: z.object({
    id: z.string().uuid(),
    date: z.date(),
    description: z.string().nullable(),
    notes: z.string().nullable(),
    value: z.number().min(0),
    status: z.enum(["SCHEDULED", "COMPLETED", "CANCELED", "CONFIRMED", "IN_PROGRESS"]),
    client: z.object({
      id: z.string().uuid(),
      name: z.string(),
      email: z.string().email(),
      phone: z.string().nullable(),
    }),
    pet: z.object({
      id: z.string().uuid(),
      name: z.string(),
      species: z.string(),
      breed: z.string().nullable(),
    }),
    treatments: z.array(z.object({
      id: z.string().uuid(),
      description: z.string(),
      cost: z.number().min(0),
    })).default([]),
  }).optional().nullable(),
});

// Schema para listagem de kanbanCards (com paginação)
export const kanbanCardListResponseSchema = z.object({
  cards: z.array(kanbanCardResponseSchema),
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
export const kanbanCardQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().max(100).optional().default(''),
  columnId: z.string().uuid().optional(),
  boardId: z.string().uuid().optional(),
  appointmentId: z.string().uuid().optional(),
  hasAppointment: z.coerce.boolean().optional(),
  includeAppointment: z.coerce.boolean().default(true),
  includeColumn: z.coerce.boolean().default(true),
  sortBy: z.enum(["title", "position", "createdAt", "updatedAt"]).default("position"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
});

// Schema para validação de parâmetros de rota
export const kanbanCardParamsSchema = z.object({
  id: z.string().uuid("ID do card inválido"),
});

// Schema para resposta de erro
export const kanbanCardErrorSchema = z.object({
  error: z.string(),
  details: z.array(z.object({
    field: z.string().optional(),
    message: z.string(),
  })).optional(),
  code: z.string().optional(),
});

// Schema para mover card entre colunas
export const moveKanbanCardSchema = z.object({
  cardId: z.string().uuid("ID do card inválido"),
  sourceColumnId: z.string().uuid("ID da coluna de origem inválido"),
  targetColumnId: z.string().uuid("ID da coluna de destino inválido"),
  newPosition: z.number().int().min(0, "Posição não pode ser negativa"),
});

// Schema para reordenar cards na mesma coluna
export const reorderKanbanCardsSchema = z.object({
  columnId: z.string().uuid("ID da coluna inválido"),
  cardOrders: z.array(z.object({
    cardId: z.string().uuid("ID do card inválido"),
    position: z.number().int().min(0, "Posição não pode ser negativa"),
  }))
  .min(1, "Pelo menos um card é necessário")
  .max(100, "Máximo de 100 cards por reordenação"),
});

// Schema para atualização de metadata do card
export const updateKanbanCardMetadataSchema = z.object({
  id: z.string().uuid("ID do card inválido"),
  metadata: z.record(z.string(), z.unknown())
    .refine(val => Object.keys(val).length <= 10, {
      message: "Metadata não pode ter mais de 10 propriedades"
    }),
});

// Schema para duplicação de card
export const duplicateKanbanCardSchema = z.object({
  cardId: z.string().uuid("ID do card inválido"),
  targetColumnId: z.string().uuid("ID da coluna de destino inválido").optional(),
  position: z.number().int().min(0, "Posição não pode ser negativa").optional(),
});

// Types derivados dos schemas
export type KanbanCardBase = z.infer<typeof kanbanCardBaseSchema>;
export type CreateKanbanCardInput = z.infer<typeof createKanbanCardSchema>;
export type CreateKanbanCardFromAppointmentInput = z.infer<typeof createKanbanCardFromAppointmentSchema>;
export type CreateMultipleKanbanCardsInput = z.infer<typeof createMultipleKanbanCardsSchema>;
export type UpdateKanbanCardInput = z.infer<typeof updateKanbanCardSchema>;
export type KanbanCardResponse = z.infer<typeof kanbanCardResponseSchema>;
export type KanbanCardListResponse = z.infer<typeof kanbanCardListResponseSchema>;
export type KanbanCardQuery = z.infer<typeof kanbanCardQuerySchema>;
export type KanbanCardParams = z.infer<typeof kanbanCardParamsSchema>;
export type KanbanCardError = z.infer<typeof kanbanCardErrorSchema>;
export type MoveKanbanCardInput = z.infer<typeof moveKanbanCardSchema>;
export type ReorderKanbanCardsInput = z.infer<typeof reorderKanbanCardsSchema>;
export type UpdateKanbanCardMetadataInput = z.infer<typeof updateKanbanCardMetadataSchema>;
export type DuplicateKanbanCardInput = z.infer<typeof duplicateKanbanCardSchema>;

// Utilitários para validação
export const validateCreateKanbanCard = (data: unknown): CreateKanbanCardInput => {
  return createKanbanCardSchema.parse(data);
};

export const validateCreateKanbanCardFromAppointment = (data: unknown): CreateKanbanCardFromAppointmentInput => {
  return createKanbanCardFromAppointmentSchema.parse(data);
};

export const validateCreateMultipleKanbanCards = (data: unknown): CreateMultipleKanbanCardsInput => {
  return createMultipleKanbanCardsSchema.parse(data);
};

export const validateUpdateKanbanCard = (data: unknown): UpdateKanbanCardInput => {
  return updateKanbanCardSchema.parse(data);
};

export const validateKanbanCardQuery = (data: unknown): KanbanCardQuery => {
  return kanbanCardQuerySchema.parse(data);
};

export const validateKanbanCardParams = (data: unknown): KanbanCardParams => {
  return kanbanCardParamsSchema.parse(data);
};

export const validateMoveKanbanCard = (data: unknown): MoveKanbanCardInput => {
  return moveKanbanCardSchema.parse(data);
};

export const validateReorderKanbanCards = (data: unknown): ReorderKanbanCardsInput => {
  return reorderKanbanCardsSchema.parse(data);
};

export const validateUpdateKanbanCardMetadata = (data: unknown): UpdateKanbanCardMetadataInput => {
  return updateKanbanCardMetadataSchema.parse(data);
};

export const validateDuplicateKanbanCard = (data: unknown): DuplicateKanbanCardInput => {
  return duplicateKanbanCardSchema.parse(data);
};

// Função para formatar erros de validação
export const formatKanbanCardValidationError = (error: z.ZodError): KanbanCardError => {
  return {
    error: "Dados de entrada inválidos",
    details: error.issues.map(issue => ({
      field: issue.path.join('.'),
      message: issue.message,
    })),
    code: "VALIDATION_ERROR",
  };
};

// Função para sanitizar dados do card
export const sanitizeKanbanCardInput = (input: CreateKanbanCardInput | UpdateKanbanCardInput): CreateKanbanCardInput | UpdateKanbanCardInput => {
  const sanitized: Partial<CreateKanbanCardInput | UpdateKanbanCardInput> = {};
  
  if ('title' in input && input.title !== undefined) {
    sanitized.title = input.title.trim();
  }
  
  if ('description' in input && input.description !== undefined) {
    sanitized.description = input.description?.trim() || null;
  }
  
  if ('position' in input && input.position !== undefined) {
    sanitized.position = input.position;
  }
  
  if ('columnId' in input && input.columnId !== undefined) {
    sanitized.columnId = input.columnId;
  }
  
  if ('appointmentId' in input && input.appointmentId !== undefined) {
    sanitized.appointmentId = input.appointmentId?.trim() || null;
  }
  
  if ('metadata' in input && input.metadata !== undefined) {
    sanitized.metadata = input.metadata;
  }
  
  if ('id' in input && input.id !== undefined) {
    (sanitized as UpdateKanbanCardInput).id = input.id;
  }
  
  return { ...input, ...sanitized } as CreateKanbanCardInput | UpdateKanbanCardInput;
};

// Interface para dados do card do banco
interface DatabaseKanbanCard {
  id: string;
  title: string;
  description: string | null;
  position: number;
  columnId: string;
  appointmentId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
  column: {
    id: string;
    name: string;
    position: number;
    color: string | null;
    board: {
      id: string;
      name: string;
      type: string;
    };
  };
  appointment?: {
    id: string;
    date: Date;
    description: string | null;
    notes: string | null;
    value: number;
    status: string;
    client: {
      id: string;
      name: string;
      email: string;
      phone: string | null;
    };
    pet: {
      id: string;
      name: string;
      species: string;
      breed: string | null;
    };
    treatments: Array<{
      id: string;
      description: string;
      cost: number;
    }>;
  } | null;
}

// Interface para filtros do Prisma - CORRIGIDA
interface KanbanCardFilters {
  OR?: Array<{
    title?: { contains: string; mode: 'insensitive' };
    description?: { contains: string; mode: 'insensitive' };
  }>;
  columnId?: string;
  boardId?: string;
  appointmentId?: string | { not: null } | null; // Corrigido: aceita diferentes tipos
}

// Interface para opções de include do Prisma
interface KanbanCardIncludeOptions {
  column: {
    select: {
      id: boolean;
      name: boolean;
      position: boolean;
      color: boolean;
      board: {
        select: {
          id: boolean;
          name: boolean;
          type: boolean;
        };
      };
    };
  };
  appointment?: {
    select: {
      id: boolean;
      date: boolean;
      description: boolean;
      notes: boolean;
      value: boolean;
      status: boolean;
      client: {
        select: {
          id: boolean;
          name: boolean;
          email: boolean;
          phone: boolean;
        };
      };
      pet: {
        select: {
          id: boolean;
          name: boolean;
          species: boolean;
          breed: boolean;
        };
      };
      treatments: {
        select: {
          id: boolean;
          description: boolean;
          cost: boolean;
        };
      };
    };
  };
}

// Função para gerar resposta padrão do card
export const formatKanbanCardResponse = (card: DatabaseKanbanCard): KanbanCardResponse => {
  return {
    id: card.id,
    title: card.title,
    description: card.description,
    position: card.position,
    columnId: card.columnId,
    appointmentId: card.appointmentId,
    metadata: card.metadata as Record<string, unknown> | null,
    createdAt: card.createdAt,
    updatedAt: card.updatedAt,
    column: {
      id: card.column.id,
      name: card.column.name,
      position: card.column.position,
      color: card.column.color,
      board: {
        id: card.column.board.id,
        name: card.column.board.name,
        type: card.column.board.type as 'APPOINTMENT' | 'TASK' | 'PROJECT',
      },
    },
    appointment: card.appointment ? {
      id: card.appointment.id,
      date: card.appointment.date,
      description: card.appointment.description,
      notes: card.appointment.notes,
      value: card.appointment.value,
      status: card.appointment.status as "SCHEDULED" | "COMPLETED" | "CANCELED" | "CONFIRMED" | "IN_PROGRESS",
      client: card.appointment.client,
      pet: card.appointment.pet,
      treatments: card.appointment.treatments,
    } : undefined,
  };
};

// Função para gerar título automático baseado no appointment
export const generateCardTitleFromAppointment = (appointment: {
  pet: { name: string; species: string };
  client: { name: string };
  date: Date;
}): string => {
  const formattedDate = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(appointment.date);
  
  return `${appointment.pet.name} (${appointment.pet.species}) - ${appointment.client.name} - ${formattedDate}`;
};

// Função para gerar descrição automática baseada no appointment
export const generateCardDescriptionFromAppointment = (appointment: {
  description?: string | null;
  treatments: Array<{ description: string; cost: number }>;
}): string => {
  const parts: string[] = [];
  
  if (appointment.description) {
    parts.push(appointment.description);
  }
  
  if (appointment.treatments.length > 0) {
    const treatmentDescriptions = appointment.treatments.map(t => t.description);
    parts.push(`Tratamentos: ${treatmentDescriptions.join(', ')}`);
  }
  
  return parts.join('\n\n');
};

// Função para calcular idade do card
export const getCardAge = (createdAt: Date): string => {
  const now = new Date();
  const diff = now.getTime() - createdAt.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days === 0) {
    return 'Hoje';
  } else if (days === 1) {
    return '1 dia';
  } else if (days < 7) {
    return `${days} dias`;
  } else if (days < 30) {
    const weeks = Math.floor(days / 7);
    return `${weeks} ${weeks === 1 ? 'semana' : 'semanas'}`;
  } else {
    const months = Math.floor(days / 30);
    return `${months} ${months === 1 ? 'mês' : 'meses'}`;
  }
};

// Função para obter cor baseada na idade do card
export const getCardAgeColor = (createdAt: Date): string => {
  const now = new Date();
  const diff = now.getTime() - createdAt.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days < 1) return 'green';
  if (days < 3) return 'blue';
  if (days < 7) return 'yellow';
  if (days < 14) return 'orange';
  return 'red';
};

// Função para validar se o card pode ser movido
export const canMoveCard = (card: KanbanCardResponse, targetColumnId: string): boolean => {
  // Não pode mover para a mesma coluna
  if (card.columnId === targetColumnId) return false;
  
  // Aqui você pode adicionar outras regras de negócio
  // Ex: cards com appointment concluído não podem ser movidos para colunas de "a fazer"
  
  return true;
};

// Função para extrair metadados úteis do card
export const extractCardMetadata = (card: KanbanCardResponse) => {
  const metadata = card.metadata || {};
  
  return {
    priority: (metadata.priority as string) || 'medium',
    tags: (metadata.tags as string[]) || [],
    dueDate: metadata.dueDate ? new Date(metadata.dueDate as string) : null,
    assignee: (metadata.assignee as string) || null,
    estimatedHours: (metadata.estimatedHours as number) || 0,
    actualHours: (metadata.actualHours as number) || 0,
  };
};

// Constants para validação
export const KANBAN_CARD_CONSTANTS = {
  TITLE: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 200,
  },
  DESCRIPTION: {
    MAX_LENGTH: 1000,
  },
  POSITION: {
    MIN: 0,
    MAX: 1000,
  },
  METADATA: {
    MAX_PROPERTIES: 10,
  },
} as const;

// Função auxiliar para criar query de cards
export const createKanbanCardQuery = (params: Partial<KanbanCardQuery> = {}): KanbanCardQuery => {
  const defaultQuery: KanbanCardQuery = {
    page: 1,
    limit: 10,
    search: '',
    columnId: undefined,
    boardId: undefined,
    appointmentId: undefined,
    hasAppointment: undefined,
    includeAppointment: true,
    includeColumn: true,
    sortBy: 'position',
    sortOrder: 'asc',
  };

  return { ...defaultQuery, ...params };
};

// Função para criar filtros de busca para o Prisma - CORRIGIDA
export const createKanbanCardFilters = (query: KanbanCardQuery): KanbanCardFilters => {
  const filters: KanbanCardFilters = {};
  
  if (query.search) {
    filters.OR = [
      { title: { contains: query.search, mode: 'insensitive' } },
      { description: { contains: query.search, mode: 'insensitive' } },
    ];
  }
  
  if (query.columnId) {
    filters.columnId = query.columnId;
  }
  
  if (query.boardId) {
    filters.boardId = query.boardId;
  }
  
  if (query.appointmentId) {
    filters.appointmentId = query.appointmentId;
  }
  
  if (query.hasAppointment !== undefined) {
    if (query.hasAppointment) {
      filters.appointmentId = { not: null };
    } else {
      filters.appointmentId = null;
    }
  }
  
  return filters;
};

// Função para criar opções de ordenação para o Prisma
export const createKanbanCardOrderBy = (query: KanbanCardQuery): Record<string, 'asc' | 'desc'> => {
  const orderBy: Record<string, 'asc' | 'desc'> = {};
  
  switch (query.sortBy) {
    case 'title':
      orderBy.title = query.sortOrder;
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
export const createKanbanCardInclude = (query: KanbanCardQuery): KanbanCardIncludeOptions => {
  const include: KanbanCardIncludeOptions = {
    column: {
      select: {
        id: true,
        name: true,
        position: true,
        color: true,
        board: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
    },
  };

  if (query.includeAppointment) {
    include.appointment = {
      select: {
        id: true,
        date: true,
        description: true,
        notes: true,
        value: true,
        status: true,
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        pet: {
          select: {
            id: true,
            name: true,
            species: true,
            breed: true,
          },
        },
        treatments: {
          select: {
            id: true,
            description: true,
            cost: true,
          },
        },
      },
    };
  }

  return include;
};

// Função para criar seleção básica do card
export const createKanbanCardSelect = () => {
  return {
    id: true,
    title: true,
    description: true,
    position: true,
    columnId: true,
    appointmentId: true,
    metadata: true,
    createdAt: true,
    updatedAt: true,
  };
};

// Função para validar posição única na coluna
export const validateUniquePositionInColumn = (
  cards: Array<{ id: string; position: number }>,
  position: number,
  excludeCardId?: string
): boolean => {
  return !cards.some(card => 
    card.position === position && card.id !== excludeCardId
  );
};

// Função para ajustar posições após deleção
export const adjustCardPositionsAfterDelete = (
  cards: Array<{ id: string; position: number }>,
  deletedPosition: number
): Array<{ id: string; position: number }> => {
  return cards
    .filter(card => card.position > deletedPosition)
    .map(card => ({
      id: card.id,
      position: card.position - 1,
    }));
};

// Função para gerar posições sequenciais para novos cards
export const generateCardPositions = (count: number, start: number = 0): number[] => {
  return Array.from({ length: count }, (_, i) => start + i);
};
