import { z } from 'zod';

// Enums correspondentes ao Prisma
export const ProductType = {
  MEDICINE: 'MEDICINE',
  VACCINE: 'VACCINE',
  SERVICE: 'SERVICE',
} as const;

export const productTypeSchema = z.enum(['MEDICINE', 'VACCINE', 'SERVICE']);

// Schema base para Product
export const productBaseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  type: productTypeSchema,
  price: z.number().min(0, "Preço não pode ser negativo"),
  stock: z.number().int().min(0, "Estoque não pode ser negativo"),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Schema para criação de Product
export const createProductSchema = z.object({
  name: z.string()
    .min(1, "Nome do produto é obrigatório")
    .max(100, "Nome muito longo")
    .regex(/^[a-zA-ZÀ-ÿ0-9\s\-().,]+$/, "Nome contém caracteres inválidos"),
  
  type: productTypeSchema,
  
  price: z.number()
    .min(0, "Preço não pode ser negativo")
    .max(100000, "Preço muito alto")
    .default(0),
  
  stock: z.number()
    .int()
    .min(0, "Estoque não pode ser negativo")
    .max(10000, "Estoque muito alto")
    .default(0),
});

// Schema para atualização de Product
export const updateProductSchema = createProductSchema.partial().extend({
  id: z.string().uuid("ID do produto inválido"),
});

// Schema para atualização de estoque
export const updateProductStockSchema = z.object({
  id: z.string().uuid("ID do produto inválido"),
  stock: z.number().int().min(0, "Estoque não pode ser negativo"),
  operation: z.enum(['INCREMENT', 'DECREMENT', 'SET']).default('SET'),
});

// Schema para resposta da API (inclui relacionamentos)
export const productResponseSchema = productBaseSchema.extend({
  treatments: z.array(z.object({
    id: z.string().uuid(),
    description: z.string(),
    cost: z.number().min(0),
    appointment: z.object({
      id: z.string().uuid(),
      date: z.date(),
      pet: z.object({
        name: z.string(),
        species: z.string(),
      }),
    }),
    createdAt: z.date(),
  })).default([]),
  
  _count: z.object({
    treatments: z.number().int().min(0),
  }).optional(),
});

// Schema para listagem de products (com paginação)
export const productListResponseSchema = z.object({
  products: z.array(productResponseSchema),
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
export const productQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().max(100).optional().default(''),
  type: productTypeSchema.optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  minStock: z.coerce.number().int().min(0).optional(),
  maxStock: z.coerce.number().int().min(0).optional(),
  lowStock: z.coerce.boolean().default(false),
  sortBy: z.enum(["name", "price", "stock", "createdAt", "updatedAt"]).default("name"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
  includeTreatments: z.coerce.boolean().default(false),
});

// Schema para validação de parâmetros de rota
export const productParamsSchema = z.object({
  id: z.string().uuid("ID do produto inválido"),
});

// Schema para resposta de erro
export const productErrorSchema = z.object({
  error: z.string(),
  details: z.array(z.object({
    field: z.string().optional(),
    message: z.string(),
  })).optional(),
  code: z.string().optional(),
});

// Schema para relatórios e estatísticas de products
export const productStatsSchema = z.object({
  total: z.number().int().min(0),
  totalValue: z.number().min(0),
  averagePrice: z.number().min(0),
  byType: z.record(z.string(), z.number().int().min(0)),
  lowStock: z.number().int().min(0),
  outOfStock: z.number().int().min(0),
});

// Schema para importação de products
export const importProductsSchema = z.object({
  products: z.array(createProductSchema)
    .min(1, "Pelo menos um produto é necessário")
    .max(100, "Máximo de 100 produtos por importação"),
  overwrite: z.boolean().default(false),
});

// Schema para criação rápida de product
export const createProductQuickSchema = z.object({
  name: z.string().min(1, "Nome do produto é obrigatório").max(100, "Nome muito longo"),
  type: productTypeSchema,
  price: z.number().min(0, "Preço não pode ser negativo").default(0),
});

// Types derivados dos schemas
export type ProductBase = z.infer<typeof productBaseSchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type UpdateProductStockInput = z.infer<typeof updateProductStockSchema>;
export type ProductResponse = z.infer<typeof productResponseSchema>;
export type ProductListResponse = z.infer<typeof productListResponseSchema>;
export type ProductQuery = z.infer<typeof productQuerySchema>;
export type ProductParams = z.infer<typeof productParamsSchema>;
export type ProductError = z.infer<typeof productErrorSchema>;
export type ProductStats = z.infer<typeof productStatsSchema>;
export type ImportProductsInput = z.infer<typeof importProductsSchema>;
export type CreateProductQuickInput = z.infer<typeof createProductQuickSchema>;
export type ProductType = z.infer<typeof productTypeSchema>;

// Utilitários para validação
export const validateCreateProduct = (data: unknown): CreateProductInput => {
  return createProductSchema.parse(data);
};

export const validateUpdateProduct = (data: unknown): UpdateProductInput => {
  return updateProductSchema.parse(data);
};

export const validateUpdateProductStock = (data: unknown): UpdateProductStockInput => {
  return updateProductStockSchema.parse(data);
};

export const validateProductQuery = (data: unknown): ProductQuery => {
  return productQuerySchema.parse(data);
};

export const validateProductParams = (data: unknown): ProductParams => {
  return productParamsSchema.parse(data);
};

export const validateImportProducts = (data: unknown): ImportProductsInput => {
  return importProductsSchema.parse(data);
};

export const validateCreateProductQuick = (data: unknown): CreateProductQuickInput => {
  return createProductQuickSchema.parse(data);
};

// Função para formatar erros de validação
export const formatProductValidationError = (error: z.ZodError): ProductError => {
  return {
    error: "Dados de entrada inválidos",
    details: error.issues.map(issue => ({
      field: issue.path.join('.'),
      message: issue.message,
    })),
    code: "VALIDATION_ERROR",
  };
};

// Função para sanitizar dados do product
export const sanitizeProductInput = (input: CreateProductInput | UpdateProductInput): CreateProductInput | UpdateProductInput => {
  const sanitized: Partial<CreateProductInput | UpdateProductInput> = {};
  
  if ('name' in input && input.name !== undefined) {
    sanitized.name = input.name.trim();
  }
  
  if ('type' in input && input.type !== undefined) {
    sanitized.type = input.type;
  }
  
  if ('price' in input && input.price !== undefined) {
    sanitized.price = input.price;
  }
  
  if ('stock' in input && input.stock !== undefined) {
    sanitized.stock = input.stock;
  }
  
  if ('id' in input && input.id !== undefined) {
    (sanitized as UpdateProductInput).id = input.id;
  }
  
  return { ...input, ...sanitized } as CreateProductInput | UpdateProductInput;
};

// Interface para dados do product do banco
interface DatabaseProduct {
  id: string;
  name: string;
  type: string;
  price: number;
  stock: number;
  createdAt: Date;
  updatedAt: Date;
  treatments?: Array<{
    id: string;
    description: string;
    cost: number;
    appointment: {
      id: string;
      date: Date;
      pet: {
        name: string;
        species: string;
      };
    };
    createdAt: Date;
  }>;
  _count?: {
    treatments: number;
  };
}

// Interface para filtros do Prisma
interface ProductFilters {
  OR?: Array<{
    name?: { contains: string; mode: 'insensitive' };
  }>;
  type?: string;
  price?: {
    gte?: number;
    lte?: number;
  };
  stock?: {
    gte?: number;
    lte?: number;
  };
}

// Interface para opções de include do Prisma
interface ProductIncludeOptions {
  treatments?: {
    select: {
      id: boolean;
      description: boolean;
      cost: boolean;
      appointment: {
        select: {
          id: boolean;
          date: boolean;
          pet: {
            select: {
              name: boolean;
              species: boolean;
            };
          };
        };
      };
      createdAt: boolean;
    };
    orderBy: {
      createdAt: 'desc';
    };
    take: number;
  };
  _count: {
    select: {
      treatments: boolean;
    };
  };
}

// Função para gerar resposta padrão do product
export const formatProductResponse = (product: DatabaseProduct): ProductResponse => {
  return {
    id: product.id,
    name: product.name,
    type: product.type as ProductType,
    price: product.price,
    stock: product.stock,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
    treatments: (product.treatments || []).map(treatment => ({
      id: treatment.id,
      description: treatment.description,
      cost: treatment.cost,
      appointment: {
        id: treatment.appointment.id,
        date: treatment.appointment.date,
        pet: {
          name: treatment.appointment.pet.name,
          species: treatment.appointment.pet.species,
        },
      },
      createdAt: treatment.createdAt,
    })),
    _count: product._count,
  };
};

// Função para formatar preço para exibição
export const formatProductPrice = (price: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(price);
};

// Função para verificar se o produto está com estoque baixo
export const isLowStock = (stock: number, threshold: number = 10): boolean => {
  return stock <= threshold;
};

// Função para verificar se o produto está fora de estoque
export const isOutOfStock = (stock: number): boolean => {
  return stock === 0;
};

// Função para calcular valor total do estoque
export const calculateInventoryValue = (products: ProductResponse[]): number => {
  return products.reduce((total, product) => total + (product.price * product.stock), 0);
};

// Função para obter status do estoque
export const getStockStatus = (stock: number): 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' => {
  if (stock === 0) return 'OUT_OF_STOCK';
  if (stock <= 10) return 'LOW_STOCK';
  return 'IN_STOCK';
};

// Função para obter cor do status do estoque
export const getStockStatusColor = (status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'): string => {
  const colors = {
    IN_STOCK: 'green',
    LOW_STOCK: 'orange',
    OUT_OF_STOCK: 'red',
  };
  return colors[status];
};

// Função para obter texto do status do estoque
export const getStockStatusText = (status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'): string => {
  const texts = {
    IN_STOCK: 'Em Estoque',
    LOW_STOCK: 'Estoque Baixo',
    OUT_OF_STOCK: 'Fora de Estoque',
  };
  return texts[status];
};

// Constants para validação
export const PRODUCT_CONSTANTS = {
  NAME: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 100,
  },
  PRICE: {
    MIN: 0,
    MAX: 100000,
  },
  STOCK: {
    MIN: 0,
    MAX: 10000,
    LOW_STOCK_THRESHOLD: 10,
  },
  TYPES: {
    MEDICINE: 'MEDICINE',
    VACCINE: 'VACCINE',
    SERVICE: 'SERVICE',
  },
} as const;

// Função auxiliar para criar query de products
export const createProductQuery = (params: Partial<ProductQuery> = {}): ProductQuery => {
  const defaultQuery: ProductQuery = {
    page: 1,
    limit: 10,
    search: '',
    type: undefined,
    minPrice: undefined,
    maxPrice: undefined,
    minStock: undefined,
    maxStock: undefined,
    lowStock: false,
    sortBy: 'name',
    sortOrder: 'asc',
    includeTreatments: false,
  };

  return { ...defaultQuery, ...params };
};

// Função para criar filtros de busca para o Prisma
export const createProductFilters = (query: ProductQuery): ProductFilters => {
  const filters: ProductFilters = {};
  
  if (query.search) {
    filters.OR = [
      { name: { contains: query.search, mode: 'insensitive' } },
    ];
  }
  
  if (query.type) {
    filters.type = query.type;
  }
  
  if (query.minPrice !== undefined || query.maxPrice !== undefined) {
    filters.price = {};
    if (query.minPrice !== undefined) {
      filters.price.gte = query.minPrice;
    }
    if (query.maxPrice !== undefined) {
      filters.price.lte = query.maxPrice;
    }
  }
  
  if (query.minStock !== undefined || query.maxStock !== undefined || query.lowStock) {
    filters.stock = {};
    if (query.minStock !== undefined) {
      filters.stock.gte = query.minStock;
    }
    if (query.maxStock !== undefined) {
      filters.stock.lte = query.maxStock;
    }
    if (query.lowStock) {
      filters.stock.lte = PRODUCT_CONSTANTS.STOCK.LOW_STOCK_THRESHOLD;
    }
  }
  
  return filters;
};

// Função para criar opções de ordenação para o Prisma
export const createProductOrderBy = (query: ProductQuery): Record<string, 'asc' | 'desc'> => {
  const orderBy: Record<string, 'asc' | 'desc'> = {};
  
  switch (query.sortBy) {
    case 'name':
      orderBy.name = query.sortOrder;
      break;
    case 'price':
      orderBy.price = query.sortOrder;
      break;
    case 'stock':
      orderBy.stock = query.sortOrder;
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
export const createProductInclude = (query: ProductQuery): ProductIncludeOptions => {
  const include: ProductIncludeOptions = {
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
        appointment: {
          select: {
            id: true,
            date: true,
            pet: {
              select: {
                name: true,
                species: true,
              },
            },
          },
        },
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    };
  }

  return include;
};

// Função para criar seleção básica do product
export const createProductSelect = () => {
  return {
    id: true,
    name: true,
    type: true,
    price: true,
    stock: true,
    createdAt: true,
    updatedAt: true,
  };
};

// Função para atualizar estoque baseado na operação
export const calculateNewStock = (currentStock: number, newStock: number, operation: 'INCREMENT' | 'DECREMENT' | 'SET'): number => {
  switch (operation) {
    case 'INCREMENT':
      return currentStock + newStock;
    case 'DECREMENT':
      return Math.max(0, currentStock - newStock);
    case 'SET':
      return newStock;
    default:
      return currentStock;
  }
};

// Função para validar se há estoque suficiente para venda
export const validateStockForSale = (currentStock: number, quantity: number): boolean => {
  return currentStock >= quantity;
};

// Função para gerar código SKU baseado no tipo e nome
export const generateProductSKU = (name: string, type: ProductType): string => {
  const prefix = type.substring(0, 3).toUpperCase();
  const nameCode = name.substring(0, 3).toUpperCase().replace(/\s/g, '');
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${nameCode}-${random}`;
};
