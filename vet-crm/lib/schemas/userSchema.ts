// lib/schemas/userSchema.ts
import { z } from 'zod';

// Enums correspondentes ao Prisma
export const Role = {
  ADMIN: 'ADMIN',
  VETERINARIAN: 'VETERINARIAN',
  RECEPTIONIST: 'RECEPTIONIST',
} as const;

export const roleSchema = z.enum(['ADMIN', 'VETERINARIAN', 'RECEPTIONIST']);

// Schema base para User
export const userBaseSchema = z.object({
  id: z.string().uuid(),
  name: z.string().nullable(),
  email: z.string().email("Email inválido"),
  emailVerified: z.date().nullable(),
  image: z.string().url("URL da imagem inválida").nullable(),
  password: z.string().nullable(),
  role: roleSchema,
  permissions: z.array(z.string()),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Schema para criação de User
export const createUserSchema = z.object({
  name: z.string()
    .min(1, "Nome é obrigatório")
    .max(100, "Nome muito longo")
    .regex(/^[a-zA-ZÀ-ÿ\s]+$/, "Nome deve conter apenas letras e espaços")
    .optional()
    .or(z.literal('')),
  
  email: z.string()
    .email("Email inválido")
    .max(255, "Email muito longo"),
  
  password: z.string()
    .min(6, "Senha deve ter pelo menos 6 caracteres")
    .max(100, "Senha muito longa")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Senha deve conter pelo menos uma letra maiúscula, uma minúscula e um número"),
  
  role: roleSchema.default('VETERINARIAN'),
  
  permissions: z.array(z.string())
    .max(50, "Máximo de 50 permissões")
    .default([]),
  
  image: z.string()
    .url("URL da imagem inválida")
    .max(500, "URL da imagem muito longa")
    .optional()
    .or(z.literal('')),
});

// Schema para atualização de User
export const updateUserSchema = createUserSchema
  .omit({ password: true })
  .partial()
  .extend({
    id: z.string().uuid("ID do usuário inválido"),
    currentPassword: z.string().min(1, "Senha atual é obrigatória").optional(),
    newPassword: z.string()
      .min(6, "Nova senha deve ter pelo menos 6 caracteres")
      .max(100, "Nova senha muito longa")
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Nova senha deve conter pelo menos uma letra maiúscula, uma minúscula e um número")
      .optional(),
  });

// Schema para atualização de perfil (próprio usuário)
export const updateProfileSchema = z.object({
  name: z.string()
    .min(1, "Nome é obrigatório")
    .max(100, "Nome muito longo")
    .regex(/^[a-zA-ZÀ-ÿ\s]+$/, "Nome deve conter apenas letras e espaços")
    .optional(),
  
  email: z.string()
    .email("Email inválido")
    .max(255, "Email muito longo")
    .optional(),
  
  image: z.string()
    .url("URL da imagem inválida")
    .max(500, "URL da imagem muito longa")
    .optional()
    .or(z.literal('')),
  
  currentPassword: z.string().min(1, "Senha atual é obrigatória").optional(),
  newPassword: z.string()
    .min(6, "Nova senha deve ter pelo menos 6 caracteres")
    .max(100, "Nova senha muito longa")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Nova senha deve conter pelo menos uma letra maiúscula, uma minúscula e um número")
    .optional(),
});

// Schema para alteração de senha
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Senha atual é obrigatória"),
  newPassword: z.string()
    .min(6, "Nova senha deve ter pelo menos 6 caracteres")
    .max(100, "Nova senha muito longa")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Nova senha deve conter pelo menos uma letra maiúscula, uma minúscula e um número"),
  confirmPassword: z.string().min(1, "Confirmação de senha é obrigatória"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

// Schema para resposta da API (exclui senha e dados sensíveis)
export const userResponseSchema = userBaseSchema
  .omit({ password: true })
  .extend({
    accounts: z.array(z.object({
      id: z.string().uuid(),
      provider: z.string(),
      providerAccountId: z.string(),
      type: z.string(),
    })).default([]),
    
    sessions: z.array(z.object({
      id: z.string().uuid(),
      sessionToken: z.string(),
      expires: z.date(),
    })).default([]),
    
    boards: z.array(z.object({
      id: z.string().uuid(),
      name: z.string(),
      type: z.enum(['APPOINTMENT', 'TASK', 'PROJECT']),
      description: z.string().nullable(),
    })).default([]),
    
    _count: z.object({
      accounts: z.number().int().min(0),
      sessions: z.number().int().min(0),
      boards: z.number().int().min(0),
    }).optional(),
  });

// Schema para listagem de users (com paginação)
export const userListResponseSchema = z.object({
  users: z.array(userResponseSchema),
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
export const userQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().max(100).optional().default(''),
  role: roleSchema.optional(),
  emailVerified: z.coerce.boolean().optional(),
  sortBy: z.enum(["name", "email", "role", "createdAt", "updatedAt"]).default("name"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
  includeAccounts: z.coerce.boolean().default(false),
  includeSessions: z.coerce.boolean().default(false),
  includeBoards: z.coerce.boolean().default(false),
});

// Schema para validação de parâmetros de rota
export const userParamsSchema = z.object({
  id: z.string().uuid("ID do usuário inválido"),
});

// Schema para resposta de erro
export const userErrorSchema = z.object({
  error: z.string(),
  details: z.array(z.object({
    field: z.string().optional(),
    message: z.string(),
  })).optional(),
  code: z.string().optional(),
});

// Schema para login
export const loginSchema = z.object({
  email: z.string()
    .email("Email inválido")
    .min(1, "Email é obrigatório"),
  
  password: z.string()
    .min(1, "Senha é obrigatória"),
  
  rememberMe: z.boolean().default(false),
});

// Schema para registro
export const registerSchema = createUserSchema.pick({
  name: true,
  email: true,
  password: true,
}).extend({
  confirmPassword: z.string().min(1, "Confirmação de senha é obrigatória"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

// Schema para verificação de email
export const verifyEmailSchema = z.object({
  token: z.string().min(1, "Token de verificação é obrigatório"),
});

// Schema para recuperação de senha
export const forgotPasswordSchema = z.object({
  email: z.string()
    .email("Email inválido")
    .min(1, "Email é obrigatório"),
});

// Schema para redefinição de senha
export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token de redefinição é obrigatório"),
  password: z.string()
    .min(6, "Senha deve ter pelo menos 6 caracteres")
    .max(100, "Senha muito longa")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Senha deve conter pelo menos uma letra maiúscula, uma minúscula e um número"),
  confirmPassword: z.string().min(1, "Confirmação de senha é obrigatória"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

// Schema para relatórios e estatísticas de users
export const userStatsSchema = z.object({
  total: z.number().int().min(0),
  byRole: z.record(z.string(), z.number().int().min(0)),
  verified: z.number().int().min(0),
  unverified: z.number().int().min(0),
  activeToday: z.number().int().min(0),
  newThisWeek: z.number().int().min(0),
  newThisMonth: z.number().int().min(0),
});

// Schema para permissões
export const permissionSchema = z.object({
  action: z.string().min(1, "Ação é obrigatória"),
  resource: z.string().min(1, "Recurso é obrigatório"),
  allowed: z.boolean().default(true),
});

export const updatePermissionsSchema = z.object({
  userId: z.string().uuid("ID do usuário inválido"),
  permissions: z.array(z.string())
    .max(100, "Máximo de 100 permissões")
    .default([]),
});

// Types derivados dos schemas
export type Role = z.infer<typeof roleSchema>;
export type UserBase = z.infer<typeof userBaseSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type UserResponse = z.infer<typeof userResponseSchema>;
export type UserListResponse = z.infer<typeof userListResponseSchema>;
export type UserQuery = z.infer<typeof userQuerySchema>;
export type UserParams = z.infer<typeof userParamsSchema>;
export type UserError = z.infer<typeof userErrorSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type UserStats = z.infer<typeof userStatsSchema>;
export type Permission = z.infer<typeof permissionSchema>;
export type UpdatePermissionsInput = z.infer<typeof updatePermissionsSchema>;

// Utilitários para validação
export const validateCreateUser = (data: unknown): CreateUserInput => {
  return createUserSchema.parse(data);
};

export const validateUpdateUser = (data: unknown): UpdateUserInput => {
  return updateUserSchema.parse(data);
};

export const validateUpdateProfile = (data: unknown): UpdateProfileInput => {
  return updateProfileSchema.parse(data);
};

export const validateChangePassword = (data: unknown): ChangePasswordInput => {
  return changePasswordSchema.parse(data);
};

export const validateUserQuery = (data: unknown): UserQuery => {
  return userQuerySchema.parse(data);
};

export const validateUserParams = (data: unknown): UserParams => {
  return userParamsSchema.parse(data);
};

export const validateLogin = (data: unknown): LoginInput => {
  return loginSchema.parse(data);
};

export const validateRegister = (data: unknown): RegisterInput => {
  return registerSchema.parse(data);
};

export const validateForgotPassword = (data: unknown): ForgotPasswordInput => {
  return forgotPasswordSchema.parse(data);
};

export const validateResetPassword = (data: unknown): ResetPasswordInput => {
  return resetPasswordSchema.parse(data);
};

export const validateUpdatePermissions = (data: unknown): UpdatePermissionsInput => {
  return updatePermissionsSchema.parse(data);
};

// Função para formatar erros de validação
export const formatUserValidationError = (error: z.ZodError): UserError => {
  return {
    error: "Dados de entrada inválidos",
    details: error.issues.map(issue => ({
      field: issue.path.join('.'),
      message: issue.message,
    })),
    code: "VALIDATION_ERROR",
  };
};

// Função para sanitizar dados do user
export const sanitizeUserInput = (input: CreateUserInput | UpdateUserInput): CreateUserInput | UpdateUserInput => {
  const sanitized: Partial<CreateUserInput | UpdateUserInput> = {};
  
  if ('name' in input && input.name !== undefined) {
    sanitized.name = input.name?.trim() || '';
  }
  
  if ('email' in input && input.email !== undefined) {
    sanitized.email = input.email.trim().toLowerCase();
  }
  
  // Apenas inclui password se estiver presente no input (apenas para CreateUserInput)
  if ('password' in input && input.password !== undefined) {
    (sanitized as CreateUserInput).password = input.password;
  }
  
  if ('role' in input && input.role !== undefined) {
    sanitized.role = input.role;
  }
  
  if ('permissions' in input && input.permissions !== undefined) {
    sanitized.permissions = input.permissions;
  }
  
  if ('image' in input && input.image !== undefined) {
    sanitized.image = input.image?.trim() || '';
  }
  
  if ('id' in input && input.id !== undefined) {
    (sanitized as UpdateUserInput).id = input.id;
  }
  
  // Para UpdateUserInput, inclui os campos específicos
  if ('currentPassword' in input && input.currentPassword !== undefined) {
    (sanitized as UpdateUserInput).currentPassword = input.currentPassword;
  }
  
  if ('newPassword' in input && input.newPassword !== undefined) {
    (sanitized as UpdateUserInput).newPassword = input.newPassword;
  }
  
  return { ...input, ...sanitized } as CreateUserInput | UpdateUserInput;
};

// Interface para dados do user do banco
interface DatabaseUser {
  id: string;
  name: string | null;
  email: string;
  emailVerified: Date | null;
  image: string | null;
  password: string | null;
  role: string;
  permissions: string[];
  createdAt: Date;
  updatedAt: Date;
  accounts?: Array<{
    id: string;
    provider: string;
    providerAccountId: string;
    type: string;
  }>;
  sessions?: Array<{
    id: string;
    sessionToken: string;
    expires: Date;
  }>;
  boards?: Array<{
    id: string;
    name: string;
    type: string;
    description: string | null;
  }>;
  _count?: {
    accounts: number;
    sessions: number;
    boards: number;
  };
}

// Interface para filtros do Prisma
interface UserFilters {
  OR?: Array<{
    name?: { contains: string; mode: 'insensitive' };
    email?: { contains: string; mode: 'insensitive' };
  }>;
  role?: string;
  emailVerified?: { not: null } | null;
}

// Interface para opções de include do Prisma
interface UserIncludeOptions {
  accounts?: boolean | {
    select: {
      id: boolean;
      provider: boolean;
      providerAccountId: boolean;
      type: boolean;
    };
  };
  sessions?: boolean | {
    select: {
      id: boolean;
      sessionToken: boolean;
      expires: boolean;
    };
  };
  boards?: boolean | {
    select: {
      id: boolean;
      name: boolean;
      type: boolean;
      description: boolean;
    };
  };
  _count?: {
    select: {
      accounts: boolean;
      sessions: boolean;
      boards: boolean;
    };
  };
}

// Função para gerar resposta padrão do user
export const formatUserResponse = (user: DatabaseUser): UserResponse => {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    emailVerified: user.emailVerified,
    image: user.image,
    role: user.role as Role,
    permissions: user.permissions,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    accounts: (user.accounts || []).map(account => ({
      id: account.id,
      provider: account.provider,
      providerAccountId: account.providerAccountId,
      type: account.type,
    })),
    sessions: (user.sessions || []).map(session => ({
      id: session.id,
      sessionToken: session.sessionToken,
      expires: session.expires,
    })),
    boards: (user.boards || []).map(board => ({
      id: board.id,
      name: board.name,
      type: board.type as 'APPOINTMENT' | 'TASK' | 'PROJECT',
      description: board.description,
    })),
    _count: user._count,
  };
};

// Função para verificar permissões do usuário
export const hasPermission = (user: UserResponse, permission: string): boolean => {
  return user.permissions.includes(permission) || user.role === 'ADMIN';
};

// Função para verificar role do usuário
export const hasRole = (user: UserResponse, role: Role): boolean => {
  return user.role === role;
};

// Função para verificar se é admin
export const isAdmin = (user: UserResponse): boolean => {
  return user.role === 'ADMIN';
};

// Função para verificar se é veterinário
export const isVeterinarian = (user: UserResponse): boolean => {
  return user.role === 'VETERINARIAN';
};

// Função para verificar se é recepcionista
export const isReceptionist = (user: UserResponse): boolean => {
  return user.role === 'RECEPTIONIST';
};

// Função para verificar se email está verificado
export const isEmailVerified = (user: UserResponse): boolean => {
  return user.emailVerified !== null;
};

// Constants para validação
export const USER_CONSTANTS = {
  NAME: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 100,
  },
  EMAIL: {
    MAX_LENGTH: 255,
  },
  PASSWORD: {
    MIN_LENGTH: 6,
    MAX_LENGTH: 100,
  },
  PERMISSIONS: {
    MAX_COUNT: 100,
  },
  ROLES: {
    ADMIN: 'ADMIN',
    VETERINARIAN: 'VETERINARIAN',
    RECEPTIONIST: 'RECEPTIONIST',
  },
} as const;

// Função auxiliar para criar query de users
export const createUserQuery = (params: Partial<UserQuery> = {}): UserQuery => {
  const defaultQuery: UserQuery = {
    page: 1,
    limit: 10,
    search: '',
    role: undefined,
    emailVerified: undefined,
    sortBy: 'name',
    sortOrder: 'asc',
    includeAccounts: false,
    includeSessions: false,
    includeBoards: false,
  };

  return { ...defaultQuery, ...params };
};

// Função para criar filtros de busca para o Prisma
export const createUserFilters = (query: UserQuery): UserFilters => {
  const filters: UserFilters = {};
  
  if (query.search) {
    filters.OR = [
      { name: { contains: query.search, mode: 'insensitive' } },
      { email: { contains: query.search, mode: 'insensitive' } },
    ];
  }
  
  if (query.role) {
    filters.role = query.role;
  }
  
  if (query.emailVerified !== undefined) {
    filters.emailVerified = query.emailVerified ? { not: null } : null;
  }
  
  return filters;
};

// Função para criar opções de ordenação para o Prisma
export const createUserOrderBy = (query: UserQuery): Record<string, 'asc' | 'desc'> => {
  const orderBy: Record<string, 'asc' | 'desc'> = {};
  
  switch (query.sortBy) {
    case 'name':
      orderBy.name = query.sortOrder;
      break;
    case 'email':
      orderBy.email = query.sortOrder;
      break;
    case 'role':
      orderBy.role = query.sortOrder;
      break;
    case 'createdAt':
      orderBy.createdAt = query.sortOrder;
      break;
    case 'updatedAt':
      orderBy.updatedAt = query.sortOrder;
      break;
    default:
      orderBy.name = 'asc';
  }
  
  return orderBy;
};

// Função para criar opções de include para o Prisma
export const createUserInclude = (query: UserQuery): UserIncludeOptions => {
  const include: UserIncludeOptions = {
    _count: {
      select: {
        accounts: true,
        sessions: true,
        boards: true,
      },
    },
  };

  if (query.includeAccounts) {
    include.accounts = {
      select: {
        id: true,
        provider: true,
        providerAccountId: true,
        type: true,
      },
    };
  }

  if (query.includeSessions) {
    include.sessions = {
      select: {
        id: true,
        sessionToken: true,
        expires: true,
      },
    };
  }

  if (query.includeBoards) {
    include.boards = {
      select: {
        id: true,
        name: true,
        type: true,
        description: true,
      },
    };
  }

  return include;
};

// Função para criar seleção básica do user
export const createUserSelect = () => {
  return {
    id: true,
    name: true,
    email: true,
    emailVerified: true,
    image: true,
    role: true,
    permissions: true,
    createdAt: true,
    updatedAt: true,
  };
};

// Função para gerar avatar padrão baseado no nome
export const generateDefaultAvatar = (name: string | null, email: string): string => {
  const initial = name ? name.charAt(0).toUpperCase() : email.charAt(0).toUpperCase();
  const colors = [
    'FF6B6B', '4ECDC4', '45B7D1', '96CEB4', 'FFEAA7', 
    'DDA0DD', '98D8C8', 'F7DC6F', 'BB8FCE', '85C1E9'
  ];
  const color = colors[initial.charCodeAt(0) % colors.length];
  return `https://ui-avatars.com/api/?name=${initial}&background=${color}&color=fff&size=128`;
};

// Função para verificar força da senha
export const checkPasswordStrength = (password: string): 'weak' | 'medium' | 'strong' => {
  const strongRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  const mediumRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d]{6,}$/;
  
  if (strongRegex.test(password)) return 'strong';
  if (mediumRegex.test(password)) return 'medium';
  return 'weak';
};

// Função para obter texto da força da senha
export const getPasswordStrengthText = (strength: 'weak' | 'medium' | 'strong'): string => {
  const texts = {
    weak: 'Fraca',
    medium: 'Média',
    strong: 'Forte',
  };
  return texts[strength];
};

// Função para obter cor da força da senha
export const getPasswordStrengthColor = (strength: 'weak' | 'medium' | 'strong'): string => {
  const colors = {
    weak: 'red',
    medium: 'orange',
    strong: 'green',
  };
  return colors[strength];
};

// Função para formatar data de verificação de email
export const formatEmailVerifiedDate = (date: Date | null): string => {
  if (!date) return 'Não verificado';
  
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

// Função para obter texto do role
export const getRoleText = (role: Role): string => {
  const texts = {
    ADMIN: 'Administrador',
    VETERINARIAN: 'Veterinário',
    RECEPTIONIST: 'Recepcionista',
  };
  return texts[role];
};

// Função para obter cor do role
export const getRoleColor = (role: Role): string => {
  const colors = {
    ADMIN: 'purple',
    VETERINARIAN: 'blue',
    RECEPTIONIST: 'green',
  };
  return colors[role];
};

// Função para gerar permissões padrão baseado no role
export const getDefaultPermissions = (role: Role): string[] => {
  const basePermissions = ['profile:read', 'profile:update'];
  
  const rolePermissions: Record<Role, string[]> = {
    ADMIN: [
      ...basePermissions,
      'users:read',
      'users:create',
      'users:update',
      'users:delete',
      'clients:read',
      'clients:create',
      'clients:update',
      'clients:delete',
      'pets:read',
      'pets:create',
      'pets:update',
      'pets:delete',
      'appointments:read',
      'appointments:create',
      'appointments:update',
      'appointments:delete',
      'products:read',
      'products:create',
      'products:update',
      'products:delete',
      'boards:read',
      'boards:create',
      'boards:update',
      'boards:delete',
    ],
    VETERINARIAN: [
      ...basePermissions,
      'clients:read',
      'pets:read',
      'pets:create',
      'pets:update',
      'appointments:read',
      'appointments:create',
      'appointments:update',
      'products:read',
      'boards:read',
      'boards:create',
      'boards:update',
    ],
    RECEPTIONIST: [
      ...basePermissions,
      'clients:read',
      'clients:create',
      'clients:update',
      'pets:read',
      'pets:create',
      'appointments:read',
      'appointments:create',
      'appointments:update',
      'products:read',
      'boards:read',
    ],
  };
  
  return rolePermissions[role];
};

// Função para validar se usuário pode gerenciar outro usuário
export const canManageUser = (currentUser: UserResponse, targetUser: UserResponse): boolean => {
  if (currentUser.id === targetUser.id) return true; // Pode gerenciar a si mesmo
  if (currentUser.role === 'ADMIN') return true; // Admin pode gerenciar todos
  if (currentUser.role === 'VETERINARIAN' && targetUser.role === 'RECEPTIONIST') return true; // Veterinário pode gerenciar recepcionista
  return false;
};
