import { z } from 'zod';

// Schema base para Pet (para uso em relacionamentos)
export const petBaseSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, "Nome do pet é obrigatório"),
  species: z.string().min(1, "Espécie é obrigatória"),
  breed: z.string().optional().nullable(),
  birthDate: z.date().optional().nullable(),
  clientId: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Schema para criação de Pet
export const createPetSchema = z.object({
  name: z.string().min(1, "Nome do pet é obrigatório").max(100, "Nome muito longo"),
  species: z.string().min(1, "Espécie é obrigatória").max(50, "Espécie muito longa"),
  breed: z.string().max(100, "Raça muito longa").optional().nullable(),
  birthDate: z.string().optional().nullable().transform((val) => val ? new Date(val) : null),
  clientId: z.string().uuid("ID do cliente inválido"),
});

// Schema para atualização de Pet
export const updatePetSchema = createPetSchema.partial().extend({
  id: z.string().uuid("ID do pet inválido"),
});

// Schema base para Client
export const clientBaseSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("Email inválido"),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Schema para criação de Client
export const createClientSchema = z.object({
  name: z.string()
    .min(1, "Nome é obrigatório")
    .max(200, "Nome muito longo")
    .regex(/^[a-zA-ZÀ-ÿ\s']+$/, "Nome deve conter apenas letras e espaços"),
  
  email: z.string()
    .email("Email inválido")
    .max(150, "Email muito longo")
    .toLowerCase(),
  
  phone: z.string()
    .max(20, "Telefone muito longo")
    .regex(/^[\d\s\(\)\-\+]+$/, "Telefone deve conter apenas números e caracteres de formatação")
    .optional()
    .nullable()
    .transform(val => val?.trim() || null),
  
  address: z.string()
    .max(500, "Endereço muito longo")
    .optional()
    .nullable()
    .transform(val => val?.trim() || null),
  
  pets: z.array(createPetSchema).optional().default([]),
});

// Schema para atualização de Client
export const updateClientSchema = createClientSchema.partial().extend({
  id: z.string().uuid("ID do cliente inválido"),
});

// Schema para resposta da API (inclui relacionamentos)
export const clientResponseSchema = clientBaseSchema.extend({
  pets: z.array(petBaseSchema).default([]),
  appointments: z.array(z.object({
    id: z.string().uuid(),
    date: z.date(),
    status: z.enum(["SCHEDULED", "COMPLETED", "CANCELED", "CONFIRMED", "IN_PROGRESS"]),
  })).default([]),
  _count: z.object({
    pets: z.number().int().min(0),
    appointments: z.number().int().min(0),
  }).optional(),
});

// Schema para listagem de clients (com paginação)
export const clientListResponseSchema = z.object({
  clients: z.array(clientResponseSchema),
  pagination: z.object({
    page: z.number().int().min(1),
    limit: z.number().int().min(1),
    total: z.number().int().min(0),
    totalPages: z.number().int().min(0),
    hasNext: z.boolean(),
    hasPrev: z.boolean(),
  }),
});

// Schema para query parameters de listagem - CORRIGIDO
export const clientQuerySchema = z.object({
  page: z.preprocess(
    (val) => {
      if (val === undefined || val === null) return 1;
      const num = Number(val);
      return isNaN(num) ? 1 : Math.max(1, num);
    },
    z.number().int().min(1)
  ).default(1),
  
  limit: z.preprocess(
    (val) => {
      if (val === undefined || val === null) return 10;
      const num = Number(val);
      return isNaN(num) ? 10 : Math.max(1, Math.min(100, num));
    },
    z.number().int().min(1).max(100)
  ).default(10),
  
  search: z.string().max(100).optional().default(''),
  sortBy: z.enum(["name", "email", "createdAt", "updatedAt"]).default("name"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
});

// Schema alternativo mais simples para query parameters
export const clientQuerySchemaSimple = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().max(100).optional().default(''),
  sortBy: z.enum(["name", "email", "createdAt", "updatedAt"]).default("name"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
});

// Schema para validação de parâmetros de rota
export const clientParamsSchema = z.object({
  id: z.string().uuid("ID do cliente inválido"),
});

// Schema para resposta de erro
export const clientErrorSchema = z.object({
  error: z.string(),
  details: z.array(z.object({
    field: z.string().optional(),
    message: z.string(),
  })).optional(),
  code: z.string().optional(),
});

// Types derivados dos schemas
export type ClientBase = z.infer<typeof clientBaseSchema>;
export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;
export type ClientResponse = z.infer<typeof clientResponseSchema>;
export type ClientListResponse = z.infer<typeof clientListResponseSchema>;
export type ClientQuery = z.infer<typeof clientQuerySchema>;
export type ClientParams = z.infer<typeof clientParamsSchema>;
export type ClientError = z.infer<typeof clientErrorSchema>;

export type PetBase = z.infer<typeof petBaseSchema>;
export type CreatePetInput = z.infer<typeof createPetSchema>;
export type UpdatePetInput = z.infer<typeof updatePetSchema>;

// Utilitários para validação
export const validateCreateClient = (data: unknown): CreateClientInput => {
  return createClientSchema.parse(data);
};

export const validateUpdateClient = (data: unknown): UpdateClientInput => {
  return updateClientSchema.parse(data);
};

export const validateClientQuery = (data: unknown): ClientQuery => {
  return clientQuerySchema.parse(data);
};

export const validateClientParams = (data: unknown): ClientParams => {
  return clientParamsSchema.parse(data);
};

// Função para formatar erros de validação
export const formatClientValidationError = (error: z.ZodError): ClientError => {
  return {
    error: "Dados de entrada inválidos",
    details: error.issues.map(issue => ({
      field: issue.path.join('.'),
      message: issue.message,
    })),
    code: "VALIDATION_ERROR",
  };
};

// Função para sanitizar dados do cliente
export const sanitizeClientInput = (input: CreateClientInput | UpdateClientInput): CreateClientInput | UpdateClientInput => {
  const sanitized: Partial<CreateClientInput | UpdateClientInput> = {};
  
  if ('name' in input && input.name !== undefined) {
    sanitized.name = input.name.trim();
  }
  
  if ('email' in input && input.email !== undefined) {
    sanitized.email = input.email.trim().toLowerCase();
  }
  
  if ('phone' in input && input.phone !== undefined) {
    sanitized.phone = input.phone?.trim() || null;
  }
  
  if ('address' in input && input.address !== undefined) {
    sanitized.address = input.address?.trim() || null;
  }
  
  if ('pets' in input && input.pets !== undefined) {
    sanitized.pets = input.pets;
  }
  
  if ('id' in input && input.id !== undefined) {
    (sanitized as UpdateClientInput).id = input.id;
  }
  
  return { ...input, ...sanitized } as CreateClientInput | UpdateClientInput;
};

// Interface para dados do cliente do banco
interface DatabaseClient {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  createdAt: Date;
  updatedAt: Date;
  pets?: Array<{
    id: string;
    name: string;
    species: string;
    breed: string | null;
    birthDate: Date | null;
    clientId: string;
    createdAt: Date;
    updatedAt: Date;
  }>;
  appointments?: Array<{
    id: string;
    date: Date;
    status: string;
  }>;
  _count?: {
    pets: number;
    appointments: number;
  };
}

// Função para gerar resposta padrão do cliente
export const formatClientResponse = (client: DatabaseClient): ClientResponse => {
  return {
    id: client.id,
    name: client.name,
    email: client.email,
    phone: client.phone,
    address: client.address,
    createdAt: client.createdAt,
    updatedAt: client.updatedAt,
    pets: (client.pets || []).map(pet => ({
      id: pet.id,
      name: pet.name,
      species: pet.species,
      breed: pet.breed,
      birthDate: pet.birthDate,
      clientId: pet.clientId,
      createdAt: pet.createdAt,
      updatedAt: pet.updatedAt,
    })),
    appointments: (client.appointments || []).map(appointment => ({
      id: appointment.id,
      date: appointment.date,
      status: appointment.status as "SCHEDULED" | "COMPLETED" | "CANCELED" | "CONFIRMED" | "IN_PROGRESS",
    })),
    _count: client._count,
  };
};

// Constants para validação
export const CLIENT_CONSTANTS = {
  NAME: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 200,
  },
  EMAIL: {
    MAX_LENGTH: 150,
  },
  PHONE: {
    MAX_LENGTH: 20,
  },
  ADDRESS: {
    MAX_LENGTH: 500,
  },
} as const;

// Função auxiliar para criar query de clientes
export const createClientQuery = (params: Partial<ClientQuery> = {}): ClientQuery => {
  const defaultQuery: ClientQuery = {
    page: 1,
    limit: 10,
    search: '',
    sortBy: 'name',
    sortOrder: 'asc',
  };

  return { ...defaultQuery, ...params };
};
