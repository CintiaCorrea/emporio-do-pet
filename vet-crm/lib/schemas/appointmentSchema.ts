import { z } from 'zod';

// Enums correspondentes ao Prisma
export const AppointmentStatus = {
  SCHEDULED: 'SCHEDULED',
  COMPLETED: 'COMPLETED',
  CANCELED: 'CANCELED',
  CONFIRMED: 'CONFIRMED',
  IN_PROGRESS: 'IN_PROGRESS',
} as const;

export const appointmentStatusSchema = z.enum([
  'SCHEDULED',
  'COMPLETED', 
  'CANCELED',
  'CONFIRMED',
  'IN_PROGRESS',
]);

// Schema base para Appointment
export const appointmentBaseSchema = z.object({
  id: z.string().uuid(),
  clientId: z.string().uuid(),
  petId: z.string().uuid(),
  date: z.date(),
  description: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  value: z.number().min(0, "Valor não pode ser negativo"),
  status: appointmentStatusSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Schema para criação de Appointment
export const createAppointmentSchema = z.object({
  clientId: z.string().uuid("ID do cliente inválido"),
  
  petId: z.string().uuid("ID do pet inválido"),
  
  date: z.string()
    .min(1, "Data e hora são obrigatórias")
    .transform(val => {
      const date = new Date(val);
      if (isNaN(date.getTime())) {
        throw new Error("Data e hora inválidas");
      }
      return date;
    })
    .refine(val => val > new Date(), {
      message: "Agendamento deve ser para uma data futura"
    }),
  
  description: z.string()
    .max(500, "Descrição muito longa")
    .optional()
    .nullable()
    .transform(val => val?.trim() || null),
  
  notes: z.string()
    .max(1000, "Notas muito longas")
    .optional()
    .nullable()
    .transform(val => val?.trim() || null),
  
  value: z.number()
    .min(0, "Valor não pode ser negativo")
    .max(100000, "Valor muito alto")
    .default(0),
  
  status: appointmentStatusSchema.default('SCHEDULED'),
});

// Schema para atualização de Appointment
export const updateAppointmentSchema = createAppointmentSchema.partial().extend({
  id: z.string().uuid("ID do agendamento inválido"),
});

// Schema para mudança de status
export const updateAppointmentStatusSchema = z.object({
  id: z.string().uuid("ID do agendamento inválido"),
  status: appointmentStatusSchema,
  notes: z.string().max(1000, "Notas muito longas").optional().nullable(),
});

// Schema para resposta da API (inclui relacionamentos)
export const appointmentResponseSchema = appointmentBaseSchema.extend({
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
    product: z.object({
      id: z.string().uuid(),
      name: z.string(),
      type: z.enum(['MEDICINE', 'VACCINE', 'SERVICE']),
    }).optional().nullable(),
    createdAt: z.date(),
  })).default([]),
  
  kanbanCard: z.object({
    id: z.string().uuid(),
    title: z.string(),
    columnId: z.string().uuid(),
    position: z.number().int().min(0),
  }).optional().nullable(),
  
  _count: z.object({
    treatments: z.number().int().min(0),
  }).optional(),
});

// Schema para listagem de appointments (com paginação)
export const appointmentListResponseSchema = z.object({
  appointments: z.array(appointmentResponseSchema),
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
export const appointmentQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().max(100).optional().default(''),
  status: appointmentStatusSchema.optional(),
  clientId: z.string().uuid().optional(),
  petId: z.string().uuid().optional(),
  startDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
  endDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
  sortBy: z.enum(["date", "createdAt", "value", "status"]).default("date"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
  includeTreatments: z.coerce.boolean().default(false),
  includeKanbanCard: z.coerce.boolean().default(false),
});

// Schema para validação de parâmetros de rota
export const appointmentParamsSchema = z.object({
  id: z.string().uuid("ID do agendamento inválido"),
});

// Schema para resposta de erro
export const appointmentErrorSchema = z.object({
  error: z.string(),
  details: z.array(z.object({
    field: z.string().optional(),
    message: z.string(),
  })).optional(),
  code: z.string().optional(),
});

// Schema para relatórios e estatísticas
export const appointmentStatsSchema = z.object({
  total: z.number().int().min(0),
  completed: z.number().int().min(0),
  scheduled: z.number().int().min(0),
  canceled: z.number().int().min(0),
  confirmed: z.number().int().min(0),
  inProgress: z.number().int().min(0),
  totalValue: z.number().min(0),
  averageValue: z.number().min(0),
});

// Schema para criação rápida de appointment (com dados do pet e cliente)
export const createAppointmentWithRelationsSchema = z.object({
  petName: z.string().min(1, "Nome do pet é obrigatório").max(100, "Nome muito longo"),
  species: z.string().min(1, "Espécie é obrigatória").max(50, "Espécie muito longa"),
  clientId: z.string().uuid("ID do cliente inválido"),
  date: z.string().min(1, "Data e hora são obrigatórias").transform(val => new Date(val)),
  description: z.string().max(500, "Descrição muito longa").optional().nullable(),
  value: z.number().min(0, "Valor não pode ser negativo").default(0),
});

// Types derivados dos schemas
export type AppointmentBase = z.infer<typeof appointmentBaseSchema>;
export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>;
export type UpdateAppointmentStatusInput = z.infer<typeof updateAppointmentStatusSchema>;
export type AppointmentResponse = z.infer<typeof appointmentResponseSchema>;
export type AppointmentListResponse = z.infer<typeof appointmentListResponseSchema>;
export type AppointmentQuery = z.infer<typeof appointmentQuerySchema>;
export type AppointmentParams = z.infer<typeof appointmentParamsSchema>;
export type AppointmentError = z.infer<typeof appointmentErrorSchema>;
export type AppointmentStats = z.infer<typeof appointmentStatsSchema>;
export type CreateAppointmentWithRelationsInput = z.infer<typeof createAppointmentWithRelationsSchema>;
export type AppointmentStatus = z.infer<typeof appointmentStatusSchema>;

// Utilitários para validação
export const validateCreateAppointment = (data: unknown): CreateAppointmentInput => {
  return createAppointmentSchema.parse(data);
};

export const validateUpdateAppointment = (data: unknown): UpdateAppointmentInput => {
  return updateAppointmentSchema.parse(data);
};

export const validateUpdateAppointmentStatus = (data: unknown): UpdateAppointmentStatusInput => {
  return updateAppointmentStatusSchema.parse(data);
};

export const validateAppointmentQuery = (data: unknown): AppointmentQuery => {
  return appointmentQuerySchema.parse(data);
};

export const validateAppointmentParams = (data: unknown): AppointmentParams => {
  return appointmentParamsSchema.parse(data);
};

export const validateCreateAppointmentWithRelations = (data: unknown): CreateAppointmentWithRelationsInput => {
  return createAppointmentWithRelationsSchema.parse(data);
};

// Função para formatar erros de validação
export const formatAppointmentValidationError = (error: z.ZodError): AppointmentError => {
  return {
    error: "Dados de entrada inválidos",
    details: error.issues.map(issue => ({
      field: issue.path.join('.'),
      message: issue.message,
    })),
    code: "VALIDATION_ERROR",
  };
};

// Função para sanitizar dados do appointment
export const sanitizeAppointmentInput = (input: CreateAppointmentInput | UpdateAppointmentInput): CreateAppointmentInput | UpdateAppointmentInput => {
  const sanitized: Partial<CreateAppointmentInput | UpdateAppointmentInput> = {};
  
  if ('description' in input && input.description !== undefined) {
    sanitized.description = input.description?.trim() || null;
  }
  
  if ('notes' in input && input.notes !== undefined) {
    sanitized.notes = input.notes?.trim() || null;
  }
  
  if ('date' in input && input.date !== undefined) {
    sanitized.date = input.date;
  }
  
  if ('value' in input && input.value !== undefined) {
    sanitized.value = input.value;
  }
  
  if ('status' in input && input.status !== undefined) {
    sanitized.status = input.status;
  }
  
  if ('clientId' in input && input.clientId !== undefined) {
    sanitized.clientId = input.clientId;
  }
  
  if ('petId' in input && input.petId !== undefined) {
    sanitized.petId = input.petId;
  }
  
  if ('id' in input && input.id !== undefined) {
    (sanitized as UpdateAppointmentInput).id = input.id;
  }
  
  return { ...input, ...sanitized } as CreateAppointmentInput | UpdateAppointmentInput;
};

// Interface para dados do appointment do banco
interface DatabaseAppointment {
  id: string;
  clientId: string;
  petId: string;
  date: Date;
  description: string | null;
  notes: string | null;
  value: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
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
  treatments?: Array<{
    id: string;
    description: string;
    cost: number;
    product?: {
      id: string;
      name: string;
      type: string;
    } | null;
    createdAt: Date;
  }>;
  kanbanCard?: {
    id: string;
    title: string;
    columnId: string;
    position: number;
  } | null;
  _count?: {
    treatments: number;
  };
}

// Interface para filtros do Prisma
interface AppointmentFilters {
  OR?: Array<{
    description?: { contains: string; mode: 'insensitive' };
    notes?: { contains: string; mode: 'insensitive' };
    client?: { name: { contains: string; mode: 'insensitive' } };
    pet?: { name: { contains: string; mode: 'insensitive' } };
  }>;
  status?: string;
  clientId?: string;
  petId?: string;
  date?: {
    gte?: Date;
    lte?: Date;
  };
}

// Interface para opções de include do Prisma
interface AppointmentIncludeOptions {
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
  treatments?: {
    select: {
      id: boolean;
      description: boolean;
      cost: boolean;
      product: {
        select: {
          id: boolean;
          name: boolean;
          type: boolean;
        };
      };
      createdAt: boolean;
    };
    orderBy: {
      createdAt: 'desc';
    };
  };
  kanbanCard?: {
    select: {
      id: boolean;
      title: boolean;
      columnId: boolean;
      position: boolean;
    };
  };
  _count: {
    select: {
      treatments: boolean;
    };
  };
}

// Função para gerar resposta padrão do appointment
export const formatAppointmentResponse = (appointment: DatabaseAppointment): AppointmentResponse => {
  return {
    id: appointment.id,
    clientId: appointment.clientId,
    petId: appointment.petId,
    date: appointment.date,
    description: appointment.description,
    notes: appointment.notes,
    value: appointment.value,
    status: appointment.status as AppointmentStatus,
    createdAt: appointment.createdAt,
    updatedAt: appointment.updatedAt,
    client: appointment.client,
    pet: appointment.pet,
    treatments: (appointment.treatments || []).map(treatment => ({
      id: treatment.id,
      description: treatment.description,
      cost: treatment.cost,
      product: treatment.product ? {
        id: treatment.product.id,
        name: treatment.product.name,
        type: treatment.product.type as 'MEDICINE' | 'VACCINE' | 'SERVICE',
      } : undefined,
      createdAt: treatment.createdAt,
    })),
    kanbanCard: appointment.kanbanCard ? {
      id: appointment.kanbanCard.id,
      title: appointment.kanbanCard.title,
      columnId: appointment.kanbanCard.columnId,
      position: appointment.kanbanCard.position,
    } : undefined,
    _count: appointment._count,
  };
};

// Função para formatar data para exibição
export const formatAppointmentDate = (date: Date): string => {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

// Função para calcular duração estimada do appointment
export const calculateAppointmentDuration = (date: Date): string => {
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  
  if (diff < 0) {
    return "Passado";
  }
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  if (days > 0) {
    return `${days} ${days === 1 ? 'dia' : 'dias'} e ${hours} ${hours === 1 ? 'hora' : 'horas'}`;
  } else if (hours > 0) {
    return `${hours} ${hours === 1 ? 'hora' : 'horas'}`;
  } else {
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`;
  }
};

// Constants para validação
export const APPOINTMENT_CONSTANTS = {
  DESCRIPTION: {
    MAX_LENGTH: 500,
  },
  NOTES: {
    MAX_LENGTH: 1000,
  },
  VALUE: {
    MIN: 0,
    MAX: 100000,
  },
} as const;

// Função auxiliar para criar query de appointments - CORRIGIDA
export const createAppointmentQuery = (params: Partial<AppointmentQuery> = {}): AppointmentQuery => {
  const defaultQuery: AppointmentQuery = {
    page: 1,
    limit: 10,
    search: '',
    startDate: undefined,
    endDate: undefined,
    sortBy: 'date',
    sortOrder: 'asc',
    includeTreatments: false,
    includeKanbanCard: false,
    status: undefined,
    clientId: undefined,
    petId: undefined,
  };

  return { ...defaultQuery, ...params };
};

// Função para criar filtros de busca para o Prisma
export const createAppointmentFilters = (query: AppointmentQuery): AppointmentFilters => {
  const filters: AppointmentFilters = {};
  
  if (query.search) {
    filters.OR = [
      { description: { contains: query.search, mode: 'insensitive' } },
      { notes: { contains: query.search, mode: 'insensitive' } },
      { client: { name: { contains: query.search, mode: 'insensitive' } } },
      { pet: { name: { contains: query.search, mode: 'insensitive' } } },
    ];
  }
  
  if (query.status) {
    filters.status = query.status;
  }
  
  if (query.clientId) {
    filters.clientId = query.clientId;
  }
  
  if (query.petId) {
    filters.petId = query.petId;
  }
  
  if (query.startDate || query.endDate) {
    filters.date = {};
    if (query.startDate) {
      filters.date.gte = query.startDate;
    }
    if (query.endDate) {
      filters.date.lte = query.endDate;
    }
  }
  
  return filters;
};

// Função para criar opções de ordenação para o Prisma
export const createAppointmentOrderBy = (query: AppointmentQuery): Record<string, 'asc' | 'desc'> => {
  const orderBy: Record<string, 'asc' | 'desc'> = {};
  
  switch (query.sortBy) {
    case 'date':
      orderBy.date = query.sortOrder;
      break;
    case 'createdAt':
      orderBy.createdAt = query.sortOrder;
      break;
    case 'value':
      orderBy.value = query.sortOrder;
      break;
    case 'status':
      orderBy.status = query.sortOrder;
      break;
    default:
      orderBy.date = 'asc';
  }
  
  return orderBy;
};

// Função para criar opções de include para o Prisma
export const createAppointmentInclude = (query: AppointmentQuery): AppointmentIncludeOptions => {
  const include: AppointmentIncludeOptions = {
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
    _count: {
      select: {
        treatments: true,
      },
    },
  };

  if (query.includeTreatments) {
    include.treatments = {
      select: {
        id: true,
        description: true,
        cost: true,
        product: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    };
  }

  if (query.includeKanbanCard) {
    include.kanbanCard = {
      select: {
        id: true,
        title: true,
        columnId: true,
        position: true,
      },
    };
  }

  return include;
};

// Função para criar seleção básica do appointment
export const createAppointmentSelect = () => {
  return {
    id: true,
    clientId: true,
    petId: true,
    date: true,
    description: true,
    notes: true,
    value: true,
    status: true,
    createdAt: true,
    updatedAt: true,
  };
};
