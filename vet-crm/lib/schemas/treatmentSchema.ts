import { z } from 'zod';

// Enums correspondentes ao Prisma
export const ProductType = {
  MEDICINE: 'MEDICINE',
  VACCINE: 'VACCINE',
  SERVICE: 'SERVICE',
} as const;

export const productTypeSchema = z.enum(['MEDICINE', 'VACCINE', 'SERVICE']);

// Schema base para Treatment
export const treatmentBaseSchema = z.object({
  id: z.string().uuid(),
  appointmentId: z.string().uuid(),
  petId: z.string().uuid(),
  description: z.string(),
  cost: z.number().min(0, "Custo não pode ser negativo"),
  productId: z.string().uuid().optional().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Schema para criação de Treatment
export const createTreatmentSchema = z.object({
  appointmentId: z.string().uuid("ID do agendamento inválido"),
  
  petId: z.string().uuid("ID do pet inválido"),
  
  description: z.string()
    .min(1, "Descrição do tratamento é obrigatória")
    .max(500, "Descrição muito longa")
    .regex(/^[a-zA-ZÀ-ÿ0-9\s.,!?\-()]+$/, "Descrição contém caracteres inválidos"),
  
  cost: z.number()
    .min(0, "Custo não pode ser negativo")
    .max(100000, "Custo muito alto")
    .default(0),
  
  productId: z.string()
    .uuid("ID do produto inválido")
    .optional()
    .nullable()
    .transform(val => val?.trim() || null),
});

// Schema para criação múltipla de Treatments
export const createMultipleTreatmentsSchema = z.object({
  appointmentId: z.string().uuid("ID do agendamento inválido"),
  petId: z.string().uuid("ID do pet inválido"),
  treatments: z.array(createTreatmentSchema.omit({ appointmentId: true, petId: true }))
    .min(1, "Pelo menos um tratamento é necessário")
    .max(20, "Máximo de 20 tratamentos por vez"),
});

// Schema para atualização de Treatment
export const updateTreatmentSchema = createTreatmentSchema.partial().extend({
  id: z.string().uuid("ID do tratamento inválido"),
});

// Schema para resposta da API (inclui relacionamentos)
export const treatmentResponseSchema = treatmentBaseSchema.extend({
  appointment: z.object({
    id: z.string().uuid(),
    date: z.date(),
    status: z.enum(["SCHEDULED", "COMPLETED", "CANCELED", "CONFIRMED", "IN_PROGRESS"]),
    description: z.string().optional().nullable(),
  }),
  
  pet: z.object({
    id: z.string().uuid(),
    name: z.string(),
    species: z.string(),
    breed: z.string().nullable(),
    client: z.object({
      id: z.string().uuid(),
      name: z.string(),
      email: z.string().email(),
    }),
  }),
  
  product: z.object({
    id: z.string().uuid(),
    name: z.string(),
    type: productTypeSchema,
    price: z.number().min(0),
    stock: z.number().int().min(0),
  }).optional().nullable(),
});

// Schema para listagem de treatments (com paginação)
export const treatmentListResponseSchema = z.object({
  treatments: z.array(treatmentResponseSchema),
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
export const treatmentQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().max(100).optional().default(''),
  appointmentId: z.string().uuid().optional(),
  petId: z.string().uuid().optional(),
  productId: z.string().uuid().optional(),
  minCost: z.coerce.number().min(0).optional(),
  maxCost: z.coerce.number().min(0).optional(),
  sortBy: z.enum(["description", "cost", "createdAt", "updatedAt"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  includeProduct: z.coerce.boolean().default(false),
  includeAppointment: z.coerce.boolean().default(true),
  includePet: z.coerce.boolean().default(true),
});

// Schema para validação de parâmetros de rota
export const treatmentParamsSchema = z.object({
  id: z.string().uuid("ID do tratamento inválido"),
});

// Schema para resposta de erro
export const treatmentErrorSchema = z.object({
  error: z.string(),
  details: z.array(z.object({
    field: z.string().optional(),
    message: z.string(),
  })).optional(),
  code: z.string().optional(),
});

// Schema para relatórios e estatísticas de treatments - CORRIGIDO
export const treatmentStatsSchema = z.object({
  total: z.number().int().min(0),
  totalCost: z.number().min(0),
  averageCost: z.number().min(0),
  byProductType: z.record(z.string(), z.number().int().min(0)), // Corrigido: adicionado key type
  byMonth: z.array(z.object({
    month: z.string(),
    count: z.number().int().min(0),
    totalCost: z.number().min(0),
  })),
});

// Schema para criação de Treatment com produto
export const createTreatmentWithProductSchema = createTreatmentSchema.extend({
  product: z.object({
    name: z.string().min(1, "Nome do produto é obrigatório").max(100, "Nome muito longo"),
    type: productTypeSchema,
    price: z.number().min(0, "Preço não pode ser negativo").default(0),
    stock: z.number().int().min(0, "Estoque não pode ser negativo").default(0),
  }).optional(),
});

// Types derivados dos schemas
export type TreatmentBase = z.infer<typeof treatmentBaseSchema>;
export type CreateTreatmentInput = z.infer<typeof createTreatmentSchema>;
export type CreateMultipleTreatmentsInput = z.infer<typeof createMultipleTreatmentsSchema>;
export type UpdateTreatmentInput = z.infer<typeof updateTreatmentSchema>;
export type TreatmentResponse = z.infer<typeof treatmentResponseSchema>;
export type TreatmentListResponse = z.infer<typeof treatmentListResponseSchema>;
export type TreatmentQuery = z.infer<typeof treatmentQuerySchema>;
export type TreatmentParams = z.infer<typeof treatmentParamsSchema>;
export type TreatmentError = z.infer<typeof treatmentErrorSchema>;
export type TreatmentStats = z.infer<typeof treatmentStatsSchema>;
export type CreateTreatmentWithProductInput = z.infer<typeof createTreatmentWithProductSchema>;
export type ProductType = z.infer<typeof productTypeSchema>;

// Utilitários para validação
export const validateCreateTreatment = (data: unknown): CreateTreatmentInput => {
  return createTreatmentSchema.parse(data);
};

export const validateCreateMultipleTreatments = (data: unknown): CreateMultipleTreatmentsInput => {
  return createMultipleTreatmentsSchema.parse(data);
};

export const validateUpdateTreatment = (data: unknown): UpdateTreatmentInput => {
  return updateTreatmentSchema.parse(data);
};

export const validateTreatmentQuery = (data: unknown): TreatmentQuery => {
  return treatmentQuerySchema.parse(data);
};

export const validateTreatmentParams = (data: unknown): TreatmentParams => {
  return treatmentParamsSchema.parse(data);
};

export const validateCreateTreatmentWithProduct = (data: unknown): CreateTreatmentWithProductInput => {
  return createTreatmentWithProductSchema.parse(data);
};

// Função para formatar erros de validação
export const formatTreatmentValidationError = (error: z.ZodError): TreatmentError => {
  return {
    error: "Dados de entrada inválidos",
    details: error.issues.map(issue => ({
      field: issue.path.join('.'),
      message: issue.message,
    })),
    code: "VALIDATION_ERROR",
  };
};

// Função para sanitizar dados do treatment
export const sanitizeTreatmentInput = (input: CreateTreatmentInput | UpdateTreatmentInput): CreateTreatmentInput | UpdateTreatmentInput => {
  const sanitized: Partial<CreateTreatmentInput | UpdateTreatmentInput> = {};
  
  if ('description' in input && input.description !== undefined) {
    sanitized.description = input.description.trim();
  }
  
  if ('cost' in input && input.cost !== undefined) {
    sanitized.cost = input.cost;
  }
  
  if ('productId' in input && input.productId !== undefined) {
    sanitized.productId = input.productId?.trim() || null;
  }
  
  if ('appointmentId' in input && input.appointmentId !== undefined) {
    sanitized.appointmentId = input.appointmentId;
  }
  
  if ('petId' in input && input.petId !== undefined) {
    sanitized.petId = input.petId;
  }
  
  if ('id' in input && input.id !== undefined) {
    (sanitized as UpdateTreatmentInput).id = input.id;
  }
  
  return { ...input, ...sanitized } as CreateTreatmentInput | UpdateTreatmentInput;
};

// Interface para dados do treatment do banco
interface DatabaseTreatment {
  id: string;
  appointmentId: string;
  petId: string;
  description: string;
  cost: number;
  productId: string | null;
  createdAt: Date;
  updatedAt: Date;
  appointment: {
    id: string;
    date: Date;
    status: string;
    description: string | null;
  };
  pet: {
    id: string;
    name: string;
    species: string;
    breed: string | null;
    client: {
      id: string;
      name: string;
      email: string;
    };
  };
  product?: {
    id: string;
    name: string;
    type: string;
    price: number;
    stock: number;
  } | null;
}

// Interface para filtros do Prisma
interface TreatmentFilters {
  OR?: Array<{
    description?: { contains: string; mode: 'insensitive' };
    product?: { name: { contains: string; mode: 'insensitive' } };
  }>;
  appointmentId?: string;
  petId?: string;
  productId?: string;
  cost?: {
    gte?: number;
    lte?: number;
  };
}

// Interface para opções de include do Prisma
interface TreatmentIncludeOptions {
  appointment: {
    select: {
      id: boolean;
      date: boolean;
      status: boolean;
      description: boolean;
    };
  };
  pet: {
    select: {
      id: boolean;
      name: boolean;
      species: boolean;
      breed: boolean;
      client: {
        select: {
          id: boolean;
          name: boolean;
          email: boolean;
        };
      };
    };
  };
  product?: {
    select: {
      id: boolean;
      name: boolean;
      type: boolean;
      price: boolean;
      stock: boolean;
    };
  };
}

// Função para gerar resposta padrão do treatment
export const formatTreatmentResponse = (treatment: DatabaseTreatment): TreatmentResponse => {
  return {
    id: treatment.id,
    appointmentId: treatment.appointmentId,
    petId: treatment.petId,
    description: treatment.description,
    cost: treatment.cost,
    productId: treatment.productId,
    createdAt: treatment.createdAt,
    updatedAt: treatment.updatedAt,
    appointment: {
      id: treatment.appointment.id,
      date: treatment.appointment.date,
      status: treatment.appointment.status as "SCHEDULED" | "COMPLETED" | "CANCELED" | "CONFIRMED" | "IN_PROGRESS",
      description: treatment.appointment.description,
    },
    pet: {
      id: treatment.pet.id,
      name: treatment.pet.name,
      species: treatment.pet.species,
      breed: treatment.pet.breed,
      client: {
        id: treatment.pet.client.id,
        name: treatment.pet.client.name,
        email: treatment.pet.client.email,
      },
    },
    product: treatment.product ? {
      id: treatment.product.id,
      name: treatment.product.name,
      type: treatment.product.type as ProductType,
      price: treatment.product.price,
      stock: treatment.product.stock,
    } : undefined,
  };
};

// Função para formatar custo para exibição
export const formatTreatmentCost = (cost: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cost);
};

// Função para calcular totais de treatments
export const calculateTreatmentTotals = (treatments: TreatmentResponse[]): { totalCost: number; count: number } => {
  const totalCost = treatments.reduce((sum, treatment) => sum + treatment.cost, 0);
  return {
    totalCost,
    count: treatments.length,
  };
};

// Função para agrupar treatments por tipo de produto
export const groupTreatmentsByProductType = (treatments: TreatmentResponse[]) => {
  const grouped: Record<string, TreatmentResponse[]> = {};
  
  treatments.forEach(treatment => {
    const type = treatment.product?.type || 'SEM_PRODUTO';
    if (!grouped[type]) {
      grouped[type] = [];
    }
    grouped[type].push(treatment);
  });
  
  return grouped;
};

// Constants para validação
export const TREATMENT_CONSTANTS = {
  DESCRIPTION: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 500,
  },
  COST: {
    MIN: 0,
    MAX: 100000,
  },
} as const;

// Função auxiliar para criar query de treatments
export const createTreatmentQuery = (params: Partial<TreatmentQuery> = {}): TreatmentQuery => {
  const defaultQuery: TreatmentQuery = {
    page: 1,
    limit: 10,
    search: '',
    appointmentId: undefined,
    petId: undefined,
    productId: undefined,
    minCost: undefined,
    maxCost: undefined,
    sortBy: 'createdAt',
    sortOrder: 'desc',
    includeProduct: false,
    includeAppointment: true,
    includePet: true,
  };

  return { ...defaultQuery, ...params };
};

// Função para criar filtros de busca para o Prisma
export const createTreatmentFilters = (query: TreatmentQuery): TreatmentFilters => {
  const filters: TreatmentFilters = {};
  
  if (query.search) {
    filters.OR = [
      { description: { contains: query.search, mode: 'insensitive' } },
      { product: { name: { contains: query.search, mode: 'insensitive' } } },
    ];
  }
  
  if (query.appointmentId) {
    filters.appointmentId = query.appointmentId;
  }
  
  if (query.petId) {
    filters.petId = query.petId;
  }
  
  if (query.productId) {
    filters.productId = query.productId;
  }
  
  if (query.minCost !== undefined || query.maxCost !== undefined) {
    filters.cost = {};
    if (query.minCost !== undefined) {
      filters.cost.gte = query.minCost;
    }
    if (query.maxCost !== undefined) {
      filters.cost.lte = query.maxCost;
    }
  }
  
  return filters;
};

// Função para criar opções de ordenação para o Prisma
export const createTreatmentOrderBy = (query: TreatmentQuery): Record<string, 'asc' | 'desc'> => {
  const orderBy: Record<string, 'asc' | 'desc'> = {};
  
  switch (query.sortBy) {
    case 'description':
      orderBy.description = query.sortOrder;
      break;
    case 'cost':
      orderBy.cost = query.sortOrder;
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
export const createTreatmentInclude = (query: TreatmentQuery): TreatmentIncludeOptions => {
  const include: TreatmentIncludeOptions = {
    appointment: {
      select: {
        id: true,
        date: true,
        status: true,
        description: true,
      },
    },
    pet: {
      select: {
        id: true,
        name: true,
        species: true,
        breed: true,
        client: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    },
  };

  if (query.includeProduct) {
    include.product = {
      select: {
        id: true,
        name: true,
        type: true,
        price: true,
        stock: true,
      },
    };
  }

  return include;
};

// Função para criar seleção básica do treatment
export const createTreatmentSelect = () => {
  return {
    id: true,
    appointmentId: true,
    petId: true,
    description: true,
    cost: true,
    productId: true,
    createdAt: true,
    updatedAt: true,
  };
};

// Função para validar se o produto tem estoque suficiente
export const validateProductStock = (product: { stock: number }, quantity: number = 1): boolean => {
  return product.stock >= quantity;
};

// Função para gerar descrição automática baseada no produto
export const generateTreatmentDescription = (product: { name: string; type: string }): string => {
  const typeMap: Record<string, string> = {
    MEDICINE: 'Administração de medicamento',
    VACCINE: 'Aplicação de vacina',
    SERVICE: 'Prestação de serviço',
  };
  
  return `${typeMap[product.type] || 'Tratamento'} - ${product.name}`;
};
