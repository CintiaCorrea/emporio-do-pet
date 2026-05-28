import { z } from 'zod';

// Schema base para Pet
export const petBaseSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, "Nome do pet é obrigatório"),
  species: z.string().min(1, "Espécie é obrigatória"),
  breed: z.string().optional().nullable(),
  birthDate: z.date().optional().nullable(),
  tutorId: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Schema para criação de Pet
export const createPetSchema = z.object({
  name: z.string()
    .min(1, "Nome do pet é obrigatório")
    .max(100, "Nome muito longo")
    .regex(/^[a-zA-ZÀ-ÿ\s']+$/, "Nome deve conter apenas letras e espaços"),
  
  species: z.string()
    .min(1, "Espécie é obrigatória")
    .max(50, "Espécie muito longa")
    .regex(/^[a-zA-ZÀ-ÿ\s]+$/, "Espécie deve conter apenas letras e espaços"),
  
  breed: z.string()
    .max(100, "Raça muito longa")
    .regex(/^[a-zA-ZÀ-ÿ\s\-]*$/, "Raça deve conter apenas letras, espaços e hífens")
    .optional()
    .nullable()
    .transform(val => val?.trim() || null),
  
  birthDate: z.string()
    .optional()
    .nullable()
    .transform(val => {
      if (!val) return null;
      const date = new Date(val);
      return isNaN(date.getTime()) ? null : date;
    })
    .refine(val => !val || val <= new Date(), {
      message: "Data de nascimento não pode ser no futuro"
    }),
  
  tutorId: z.string().uuid("ID do cliente inválido"),
});

// Schema para atualização de Pet
export const updatePetSchema = createPetSchema.partial().extend({
  id: z.string().uuid("ID do pet inválido"),
});

// Schema para resposta da API (inclui relacionamentos)
export const petResponseSchema = petBaseSchema.extend({
  client: z.object({
    id: z.string().uuid(),
    name: z.string(),
    email: z.string().email(),
    phone: z.string().nullable(),
  }).optional(),
  
  appointments: z.array(z.object({
    id: z.string().uuid(),
    date: z.date(),
    status: z.enum(["SCHEDULED", "COMPLETED", "CANCELED", "CONFIRMED", "IN_PROGRESS"]),
    description: z.string().optional().nullable(),
  })).default([]),
  
  treatments: z.array(z.object({
    id: z.string().uuid(),
    description: z.string(),
    cost: z.number().min(0),
    createdAt: z.date(),
  })).default([]),
  
  _count: z.object({
    appointments: z.number().int().min(0),
    treatments: z.number().int().min(0),
  }).optional(),
});

// Schema para listagem de pets (com paginação)
export const petListResponseSchema = z.object({
  pets: z.array(petResponseSchema),
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
export const petQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().max(100).optional().default(''),
  species: z.string().max(50).optional(),
  tutorId: z.string().uuid().optional(),
  sortBy: z.enum(["name", "species", "birthDate", "createdAt"]).default("name"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
  includeTutor: z.coerce.boolean().default(false),
  includeAppointments: z.coerce.boolean().default(false),
});

// Schema para validação de parâmetros de rota
export const petParamsSchema = z.object({
  id: z.string().uuid("ID do pet inválido"),
});

// Schema para resposta de erro
export const petErrorSchema = z.object({
  error: z.string(),
  details: z.array(z.object({
    field: z.string().optional(),
    message: z.string(),
  })).optional(),
  code: z.string().optional(),
});

// Schema para relacionamento com Tutor (para uso em outros schemas)
export const petWithClientSchema = petBaseSchema.extend({
  client: z.object({
    id: z.string().uuid(),
    name: z.string(),
    email: z.string().email(),
  }),
});

// Schema para criação de Pet com Tutor (para formulários)
export const createPetWithClientSchema = createPetSchema.extend({
  client: z.object({
    name: z.string().min(1, "Nome do tutor é obrigatório"),
    email: z.string().email("Email do tutor é inválido"),
    phone: z.string().optional().nullable(),
  }).optional(),
});

// Types derivados dos schemas
export type PetBase = z.infer<typeof petBaseSchema>;
export type CreatePetInput = z.infer<typeof createPetSchema>;
export type UpdatePetInput = z.infer<typeof updatePetSchema>;
export type PetResponse = z.infer<typeof petResponseSchema>;
export type PetListResponse = z.infer<typeof petListResponseSchema>;
export type PetQuery = z.infer<typeof petQuerySchema>;
export type PetParams = z.infer<typeof petParamsSchema>;
export type PetError = z.infer<typeof petErrorSchema>;
export type PetWithTutor = z.infer<typeof petWithClientSchema>;
export type CreatePetWithClientInput = z.infer<typeof createPetWithClientSchema>;

// Utilitários para validação
export const validateCreatePet = (data: unknown): CreatePetInput => {
  return createPetSchema.parse(data);
};

export const validateUpdatePet = (data: unknown): UpdatePetInput => {
  return updatePetSchema.parse(data);
};

export const validatePetQuery = (data: unknown): PetQuery => {
  return petQuerySchema.parse(data);
};

export const validatePetParams = (data: unknown): PetParams => {
  return petParamsSchema.parse(data);
};

export const validateCreatePetWithTutor = (data: unknown): CreatePetWithClientInput => {
  return createPetWithClientSchema.parse(data);
};

// Função para formatar erros de validação
export const formatPetValidationError = (error: z.ZodError): PetError => {
  return {
    error: "Dados de entrada inválidos",
    details: error.issues.map(issue => ({
      field: issue.path.join('.'),
      message: issue.message,
    })),
    code: "VALIDATION_ERROR",
  };
};

// Função para sanitizar dados do pet
export const sanitizePetInput = (input: CreatePetInput | UpdatePetInput): CreatePetInput | UpdatePetInput => {
  const sanitized: Partial<CreatePetInput | UpdatePetInput> = {};
  
  if ('name' in input && input.name !== undefined) {
    sanitized.name = input.name.trim();
  }
  
  if ('species' in input && input.species !== undefined) {
    sanitized.species = input.species.trim();
  }
  
  if ('breed' in input && input.breed !== undefined) {
    sanitized.breed = input.breed?.trim() || null;
  }
  
  if ('birthDate' in input && input.birthDate !== undefined) {
    sanitized.birthDate = input.birthDate;
  }
  
  if ('clientId' in input && input.clientId !== undefined) {
    sanitized.clientId = input.clientId;
  }
  
  if ('id' in input && input.id !== undefined) {
    (sanitized as UpdatePetInput).id = input.id;
  }
  
  return { ...input, ...sanitized } as CreatePetInput | UpdatePetInput;
};

// Interface para dados do pet do banco
interface DatabasePet {
  id: string;
  name: string;
  species: string;
  breed: string | null;
  birthDate: Date | null;
  clientId: string;
  createdAt: Date;
  updatedAt: Date;
  client?: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
  };
  appointments?: Array<{
    id: string;
    date: Date;
    status: string;
    description: string | null;
  }>;
  treatments?: Array<{
    id: string;
    description: string;
    cost: number;
    createdAt: Date;
  }>;
  _count?: {
    appointments: number;
    treatments: number;
  };
}

// Interface para filtros do Prisma
interface PetFilters {
  OR?: Array<{
    name?: { contains: string; mode: 'insensitive' };
    species?: { contains: string; mode: 'insensitive' };
    breed?: { contains: string; mode: 'insensitive' };
  }>;
  species?: { contains: string; mode: 'insensitive' };
  clientId?: string;
}

// Interface para opções de include do Prisma
interface PetIncludeOptions {
  _count: {
    select: {
      appointments: boolean;
      treatments: boolean;
    };
  };
  client?: {
    select: {
      id: boolean;
      name: boolean;
      email: boolean;
      phone: boolean;
    };
  };
  appointments?: {
    select: {
      id: boolean;
      date: boolean;
      status: boolean;
      description: boolean;
    };
    orderBy: {
      date: 'desc';
    };
    take: number;
  };
}

// Função para gerar resposta padrão do pet
export const formatPetResponse = (pet: DatabasePet): PetResponse => {
  return {
    id: pet.id,
    name: pet.name,
    species: pet.species,
    breed: pet.breed,
    birthDate: pet.birthDate,
    clientId: pet.clientId,
    createdAt: pet.createdAt,
    updatedAt: pet.updatedAt,
    client: pet.client ? {
      id: pet.client.id,
      name: pet.client.name,
      email: pet.client.email,
      phone: pet.client.phone,
    } : undefined,
    appointments: (pet.appointments || []).map(appointment => ({
      id: appointment.id,
      date: appointment.date,
      status: appointment.status as "SCHEDULED" | "COMPLETED" | "CANCELED" | "CONFIRMED" | "IN_PROGRESS",
      description: appointment.description,
    })),
    treatments: (pet.treatments || []).map(treatment => ({
      id: treatment.id,
      description: treatment.description,
      cost: treatment.cost,
      createdAt: treatment.createdAt,
    })),
    _count: pet._count,
  };
};

// Função para calcular idade do pet
export const calculatePetAge = (birthDate: Date | null): string => {
  if (!birthDate) return "Idade desconhecida";
  
  const today = new Date();
  let years = today.getFullYear() - birthDate.getFullYear();
  let months = today.getMonth() - birthDate.getMonth();
  
  if (months < 0) {
    years--;
    months += 12;
  }
  
  if (years === 0) {
    return `${months} ${months === 1 ? 'mês' : 'meses'}`;
  } else if (months === 0) {
    return `${years} ${years === 1 ? 'ano' : 'anos'}`;
  } else {
    return `${years} ${years === 1 ? 'ano' : 'anos'} e ${months} ${months === 1 ? 'mês' : 'meses'}`;
  }
};

// Função para validar espécies comuns
export const COMMON_SPECIES = [
  "Cachorro",
  "Gato",
  "Pássaro",
  "Coelho",
  "Hamster",
  "Porquinho-da-índia",
  "Tartaruga",
  "Peixe",
  "Réptil",
  "Outro"
] as const;

export const speciesSchema = z.enum(COMMON_SPECIES);

// Constants para validação
export const PET_CONSTANTS = {
  NAME: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 100,
  },
  SPECIES: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 50,
  },
  BREED: {
    MAX_LENGTH: 100,
  },
} as const;

// Função auxiliar para criar query de pets
export const createPetQuery = (params: Partial<PetQuery> = {}): PetQuery => {
  const defaultQuery: PetQuery = {
    page: 1,
    limit: 10,
    search: '',
    sortBy: 'name',
    sortOrder: 'asc',
    includeTutor: false,
    includeAppointments: false,
  };

  return { ...defaultQuery, ...params };
};

// Função para criar filtros de busca para o Prisma
export const createPetFilters = (query: PetQuery): PetFilters => {
  const filters: PetFilters = {};
  
  if (query.search) {
    filters.OR = [
      { name: { contains: query.search, mode: 'insensitive' } },
      { species: { contains: query.search, mode: 'insensitive' } },
      { breed: { contains: query.search, mode: 'insensitive' } },
    ];
  }
  
  if (query.species) {
    filters.species = { contains: query.species, mode: 'insensitive' };
  }
  
  if (query.clientId) {
    filters.clientId = query.clientId;
  }
  
  return filters;
};

// Função para criar opções de ordenação para o Prisma
export const createPetOrderBy = (query: PetQuery): Record<string, 'asc' | 'desc'> => {
  const orderBy: Record<string, 'asc' | 'desc'> = {};
  
  switch (query.sortBy) {
    case 'name':
      orderBy.name = query.sortOrder;
      break;
    case 'species':
      orderBy.species = query.sortOrder;
      break;
    case 'birthDate':
      orderBy.birthDate = query.sortOrder;
      break;
    case 'createdAt':
      orderBy.createdAt = query.sortOrder;
      break;
    default:
      orderBy.name = 'asc';
  }
  
  return orderBy;
};

// Função para criar opções de include para o Prisma - CORRIGIDA
export const createPetInclude = (query: PetQuery): PetIncludeOptions => {
  const include: PetIncludeOptions = {
    _count: {
      select: {
        appointments: true,
        treatments: true,
      },
    },
  };

  if (query.includeTutor) {
    include.client = {
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
      },
    };
  }

  if (query.includeAppointments) {
    include.appointments = {
      select: {
        id: true,
        date: true,
        status: true,
        description: true,
      },
      orderBy: {
        date: 'desc',
      },
      take: 10,
    };
  }

  return include;
};

// Função para criar seleção básica do pet (sem relacionamentos)
export const createPetSelect = () => {
  return {
    id: true,
    name: true,
    species: true,
    breed: true,
    birthDate: true,
    clientId: true,
    createdAt: true,
    updatedAt: true,
  };
};
